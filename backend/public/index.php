<?php
/**
 * DM Panda clone — PHP API (works with XAMPP PHP 8.x, MySQL on port 3307)
 *
 * Serve with:  php -S localhost:8000 -t server/public
 * Point the React dev proxy at it (already configured in vite.config.js).
 */

declare(strict_types=1);

const DB_HOST = '127.0.0.1';
const DB_PORT = '3307';
const DB_NAME = 'dmpanda';
const DB_USER = 'root';
const DB_PASS = '';

const SESSION_COOKIE = 'dm_session';
const SESSION_DAYS = 14;

ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/* ---------------------------------------------------------------- helpers */

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}

function json_in(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function out($data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $msg, int $code = 400): void
{
    out(['error' => $msg], $code);
}

function param(string $key, string $default = ''): string
{
    if (isset($_GET[$key])) return trim((string) $_GET[$key]);
    $body = json_in();
    return trim((string) ($body[$key] ?? $default));
}

/** Resolve the route path (works under the dev server and Apache). */
function route(): string
{
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $uri = preg_replace('#^/index\.php#', '', $uri) ?: '/';
    return rtrim($uri, '/') ?: '/';
}

/* ------------------------------------------------------------- auth token */

function current_user_id(): ?int
{
    $token = $_COOKIE[SESSION_COOKIE] ?? '';
    if ($token === '') return null;
    $st = db()->prepare(
        'SELECT s.user_id, s.expires_at, u.status
           FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token = ? LIMIT 1'
    );
    $st->execute([$token]);
    $row = $st->fetch();
    if (!$row) return null;
    if (strtotime((string) $row['expires_at']) < time()) return null;
    if ($row['status'] !== 'active') return null;
    return (int) $row['user_id'];
}

function require_auth(): int
{
    $uid = current_user_id();
    if ($uid === null) fail('You must be logged in to view this page.', 401);
    return $uid;
}

function require_admin(): int
{
    $uid = require_auth();
    $st = db()->prepare('SELECT role FROM users WHERE id = ?');
    $st->execute([$uid]);
    $row = $st->fetch();
    if (!$row || $row['role'] !== 'admin') fail('Admin access required.', 403);
    return $uid;
}

function get_setting(string $key, string $default = ''): string
{
    $st = db()->prepare('SELECT setting_value FROM settings WHERE setting_key = ?');
    $st->execute([$key]);
    $row = $st->fetch();
    return $row ? (string) $row['setting_value'] : $default;
}

function set_setting(string $key, string $value): void
{
    db()->prepare('INSERT INTO settings (setting_key, setting_value) VALUES (?,?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)')
        ->execute([$key, $value]);
}

/**
 * Feature key for an automation type, used for plan gating.
 * Returns null when the type is available on every plan.
 */
function plan_feature_key(string $type): ?string
{
    return match ($type) {
        'dm'           => 'dm_automation',
        'post'         => 'post_comment_dm_reply',
        'reel'         => 'reel_comment_dm_reply',
        'story'        => 'story_automation',
        'live'         => 'instagram_live_automation',
        'mention'      => 'mentions',
        'global'       => 'global_trigger',
        'moderation'   => 'comment_moderation',
        'inbox_menu'   => 'inbox_menu',
        'convo_starter'=> 'convo_starters',
        'suggest_more' => 'suggest_more',
        'welcome'      => 'welcome_message',
        'super_profile'=> 'super_profile',
        default        => null, // templates & misc available on all plans
    };
}

function plan_features(int $userId): array
{
    $st = db()->prepare(
        'SELECT p.feature_items FROM users u JOIN plans p ON p.plan_code = u.plan_code WHERE u.id = ?'
    );
    $st->execute([$userId]);
    $row = $st->fetch();
    if (!$row || !$row['feature_items']) return [];
    $items = json_decode((string) $row['feature_items'], true);
    if (!is_array($items)) return [];
    $enabled = [];
    foreach ($items as $it) {
        if (!empty($it['key']) && !empty($it['enabled'])) $enabled[$it['key']] = true;
    }
    return $enabled;
}

function assert_plan_feature(int $userId, string $type): void
{
    $key = plan_feature_key($type);
    if ($key === null) return;
    $features = plan_features($userId);
    if (empty($features[$key])) {
        fail('This feature is not included in your current plan. Upgrade to unlock it.', 403);
    }
}

function create_session(int $userId): string
{
    $token = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', time() + SESSION_DAYS * 86400);
    db()->prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)')
        ->execute([$token, $userId, $expires]);
    setcookie(SESSION_COOKIE, $token, [
        'expires'  => time() + SESSION_DAYS * 86400,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    return $token;
}

function user_array(int $id): array
{
    $st = db()->prepare('SELECT id, name, email, email_verified, plan_code, role, status, created_at FROM users WHERE id = ?');
    $st->execute([$id]);
    $u = $st->fetch() ?: [];
    if ($u) $u['id'] = (int) $u['id'];
    return $u;
}

/* =========================================================== API ROUTES */

$method = $_SERVER['REQUEST_METHOD'];
$path   = route();

/* ------------------------------------------------------------ auth ---- */

if ($path === '/api/auth/register' && $method === 'POST') {
    $in = json_in();
    $name = trim((string) ($in['name'] ?? ''));
    $email = strtolower(trim((string) ($in['email'] ?? '')));
    $password = (string) ($in['password'] ?? '');

    if ($name === '') fail('Please enter your full name.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Please enter a valid email address.');
    if (strlen($password) < 8) fail('Password must be at least 8 characters long.');

    $exists = db()->prepare('SELECT id FROM users WHERE email = ?');
    $exists->execute([$email]);
    if ($exists->fetch()) fail('An account with this email already exists.');

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $verify = bin2hex(random_bytes(16));
    db()->prepare("INSERT INTO users (name, email, password_hash, verify_token, email_verified) VALUES (?,?,?, ?, 1)")
        ->execute([$name, $email, $hash, $verify]);

    $uid = (int) db()->lastInsertId();
    create_session($uid);

    out(['user' => user_array($uid), 'message' => 'Registration successful!'], 201);
}

if ($path === '/api/auth/login' && $method === 'POST') {
    $in = json_in();
    $email = strtolower(trim((string) ($in['email'] ?? '')));
    $password = (string) ($in['password'] ?? '');

    $st = db()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    $st->execute([$email]);
    $u = $st->fetch();

    if (!$u || !$u['password_hash'] || !password_verify($password, $u['password_hash'])) {
        fail('Invalid email or password.', 401);
    }
    if ($u['status'] === 'blocked') fail('Your account has been blocked.', 403);
    if ($u['status'] === 'deleted') fail('Your account has been deleted.', 403);

    create_session((int) $u['id']);
    out(['user' => user_array((int) $u['id'])]);
}

if ($path === '/api/auth/logout' && $method === 'POST') {
    $token = $_COOKIE[SESSION_COOKIE] ?? '';
    if ($token !== '') db()->prepare('DELETE FROM sessions WHERE token = ?')->execute([$token]);
    setcookie(SESSION_COOKIE, '', ['expires' => time() - 3600, 'path' => '/']);
    out(['ok' => true]);
}

if ($path === '/api/auth/me' && $method === 'GET') {
    $uid = current_user_id();
    out(['user' => $uid ? user_array($uid) : null]);
}

if ($path === '/api/auth/profile' && $method === 'PUT') {
    $uid = require_auth();
    $name = param('name');
    if ($name === '') fail('Name cannot be empty.');
    db()->prepare('UPDATE users SET name = ? WHERE id = ?')->execute([$name, $uid]);
    out(['user' => user_array($uid)]);
}

if ($path === '/api/auth/change-password' && $method === 'POST') {
    $uid = require_auth();
    $in = json_in();
    $current = (string) ($in['current_password'] ?? '');
    $next = (string) ($in['new_password'] ?? '');
    if (strlen($next) < 8) fail('Password must be at least 8 characters long.');

    $st = db()->prepare('SELECT password_hash FROM users WHERE id = ?');
    $st->execute([$uid]);
    $row = $st->fetch();
    if (!$row || !password_verify($current, $row['password_hash'])) fail('Your current password is incorrect.');

    db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        ->execute([password_hash($next, PASSWORD_DEFAULT), $uid]);
    out(['ok' => true, 'message' => 'Password set successfully!']);
}

if ($path === '/api/auth/forgot-password' && $method === 'POST') {
    $email = strtolower(param('email'));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Please enter a valid email address.');
    $token = bin2hex(random_bytes(16));
    $st = db()->prepare('SELECT id FROM users WHERE email = ?');
    $st->execute([$email]);
    if ($st->fetch()) {
        db()->prepare('UPDATE users SET reset_token = ?, reset_expires = ? WHERE email = ?')
            ->execute([$token, date('Y-m-d H:i:s', time() + 3600), $email]);
    }
    // In production this would be emailed. Returned for local development.
    out(['ok' => true, 'reset_token' => $token, 'message' => 'Password reset link sent! Check your email.']);
}

if ($path === '/api/auth/reset-password' && $method === 'POST') {
    $in = json_in();
    $token = (string) ($in['token'] ?? '');
    $password = (string) ($in['password'] ?? '');
    if (strlen($password) < 8) fail('Password must be at least 8 characters long.');

    $st = db()->prepare('SELECT id FROM users WHERE reset_token = ? AND reset_expires > NOW() LIMIT 1');
    $st->execute([$token]);
    $u = $st->fetch();
    if (!$u) fail('Invalid recovery link. Please request a new password reset.', 400);

    db()->prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?')
        ->execute([password_hash($password, PASSWORD_DEFAULT), $u['id']]);
    out(['ok' => true, 'message' => 'Password Reset Successful!']);
}

if ($path === '/api/auth/verify-email' && $method === 'POST') {
    $in = json_in();
    $token = (string) ($in['token'] ?? '');
    $st = db()->prepare('SELECT id FROM users WHERE verify_token = ? LIMIT 1');
    $st->execute([$token]);
    $u = $st->fetch();
    if (!$u) fail('Failed to verify email.', 400);
    db()->prepare('UPDATE users SET email_verified = 1, verify_token = NULL WHERE id = ?')->execute([$u['id']]);
    out(['ok' => true]);
}

/* ----------------------------------------------------------- pricing --- */

if ($path === '/api/pricing' && $method === 'GET') {
    $rows = db()->query('SELECT * FROM plans ORDER BY display_order ASC')->fetchAll();
    $plans = array_map(static function (array $r): array {
        $r['id'] = (int) $r['id'];
        $r['is_popular'] = (bool) $r['is_popular'];
        $r['is_custom'] = (bool) $r['is_custom'];
        $r['price_monthly_inr'] = (int) $r['price_monthly_inr'];
        $r['price_yearly_inr'] = (int) $r['price_yearly_inr'];
        $r['price_yearly_monthly_inr'] = (int) $r['price_yearly_monthly_inr'];
        foreach (['feature_items', 'comparison'] as $k) {
            $r[$k] = $r[$k] ? json_decode((string) $r[$k], true) : null;
        }
        $r['actions_per_hour_limit'] = is_numeric($r['actions_per_hour_limit']) ? (int) $r['actions_per_hour_limit'] : $r['actions_per_hour_limit'];
        $r['actions_per_day_limit'] = is_numeric($r['actions_per_day_limit']) ? (int) $r['actions_per_day_limit'] : $r['actions_per_day_limit'];
        $r['actions_per_month_limit'] = is_numeric($r['actions_per_month_limit']) ? (int) $r['actions_per_month_limit'] : $r['actions_per_month_limit'];
        $r['pricing'] = [
            'monthly' => ['inr' => (int) $r['price_monthly_inr']],
            'yearly' => ['inr' => (int) $r['price_yearly_inr']],
            'yearly_monthly_display' => ['inr' => (int) $r['price_yearly_monthly_inr']],
        ];
        return $r;
    }, $rows);
    out(['plans' => $plans]);
}

/* ------------------------------------------------------------- blog ---- */

if ($path === '/api/blog' && $method === 'GET') {
    $rows = db()->query("SELECT slug, title, excerpt, category, cover_image, featured, published_at FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC")->fetchAll();
    out(['posts' => $rows]);
}

if (preg_match('#^/api/blog/([a-z0-9\-]+)$#', $path, $m) && $method === 'GET') {
    $st = db()->prepare("SELECT * FROM blog_posts WHERE slug = ? AND status = 'published'");
    $st->execute([$m[1]]);
    $post = $st->fetch();
    if (!$post) fail('Article not found.', 404);
    out(['post' => $post]);
}

/* ----------------------------------------------------------- contact --- */

if ($path === '/api/contact' && $method === 'POST') {
    $in = json_in();
    $name = trim((string) ($in['name'] ?? ''));
    $email = trim((string) ($in['email'] ?? ''));
    $subject = trim((string) ($in['subject'] ?? 'Contact form'));
    $message = trim((string) ($in['message'] ?? ''));

    if ($name === '') fail('Please enter your name.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Please enter a valid email address.');
    if (strlen($message) < 10) fail('Please describe your issue in at least 10 characters.');

    db()->prepare('INSERT INTO contact_messages (name, email, subject, message) VALUES (?,?,?,?)')
        ->execute([$name, $email, $subject, $message]);

    out(['ok' => true, 'message' => "Message sent! Our team will reply to {$email} shortly."], 201);
}

/* -------------------------------------------------------- dashboard ---- */

if ($path === '/api/dashboard/stats' && $method === 'GET') {
    $uid = require_auth();

    $st = db()->prepare('SELECT COUNT(*) c, COALESCE(SUM(messages_sent),0) m, COALESCE(SUM(comments_handled),0) cm FROM daily_stats WHERE user_id = ? AND stat_day >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)');
    $st->execute([$uid]);
    $agg = $st->fetch() ?: ['c' => 0, 'm' => 0, 'cm' => 0];

    $st = db()->prepare("SELECT COUNT(*) c FROM automations WHERE user_id = ? AND status = 'active'");
    $st->execute([$uid]);
    $active = (int) ($st->fetch()['c'] ?? 0);

    $st = db()->prepare('SELECT COUNT(*) c FROM automations WHERE user_id = ?');
    $st->execute([$uid]);
    $total = (int) ($st->fetch()['c'] ?? 0);

    $st = db()->prepare("SELECT plan_code, actions_per_month_limit, actions_per_day_limit, actions_per_hour_limit FROM plans WHERE plan_code = (SELECT plan_code FROM users WHERE id = ?)");
    $st->execute([$uid]);
    $plan = $st->fetch() ?: null;

    $limit = $plan && is_numeric($plan['actions_per_month_limit']) ? (int) $plan['actions_per_month_limit'] : 0;
    $dailyLimit = $plan && is_numeric($plan['actions_per_day_limit']) ? (int) $plan['actions_per_day_limit'] : 0;
    $hourLimit = $plan && is_numeric($plan['actions_per_hour_limit']) ? (int) $plan['actions_per_hour_limit'] : 0;
    $used = (int) $agg['m'];

    $st = db()->prepare('SELECT COALESCE(messages_sent,0) FROM daily_stats WHERE user_id = ? AND stat_day = CURDATE()');
    $st->execute([$uid]);
    $dailyUsed = (int) ($st->fetchColumn() ?: 0);

    // 14-day chart series
    $st = db()->prepare('SELECT stat_day, messages_sent AS count FROM daily_stats WHERE user_id = ? AND stat_day >= DATE_SUB(CURDATE(), INTERVAL 13 DAY) ORDER BY stat_day ASC');
    $st->execute([$uid]);
    $daily = [];
    $byDay = [];
    foreach ($st->fetchAll() as $r) {
        $byDay[(string) $r['stat_day']] = (int) $r['count'];
    }
    for ($i = 13; $i >= 0; $i--) {
        $day = date('Y-m-d', time() - $i * 86400);
        $daily[] = ['day' => $day, 'count' => $byDay[$day] ?? 0];
    }

    out(['stats' => [
        'messages_sent'      => (int) $agg['m'],
        'comments_handled'   => (int) $agg['cm'],
        'automations_active' => $active,
        'automations_total'  => $total,
        'total_contacts'     => (int) $agg['c'],
        'actions_used'       => $used,
        'actions_limit'      => $limit,
        'actions_daily_used' => $dailyUsed,
        'actions_daily_limit'=> $dailyLimit,
        'actions_hourly_limit' => $hourLimit,
        'usage_percent'      => $limit > 0 ? min(100, (int) round($used * 100 / $limit)) : 0,
        'daily'              => $daily,
    ]]);
}

/* -------------------------------------------------------- automations -- */

function automation_payload(int $uid, array $in, ?int $id = null): array
{
    $fields = [
        'type'        => (string) ($in['type'] ?? 'dm'),
        'name'        => mb_substr((string) ($in['name'] ?? ''), 0, 160),
        'keyword'     => mb_substr((string) ($in['keyword'] ?? ''), 0, 190),
        'reply_text'  => (string) ($in['reply_text'] ?? ''),
        'public_reply'=> (string) ($in['public_reply'] ?? ''),
        'media_url'   => mb_substr((string) ($in['media_url'] ?? ''), 0, 500),
        'status'      => ($in['status'] ?? 'active') === 'inactive' ? 'inactive' : 'active',
    ];
    $buttons = $in['buttons'] ?? null;
    if (is_string($buttons) && trim($buttons) !== '') {
        json_decode($buttons, true);
        if (json_last_error() !== JSON_ERROR_NONE) fail('Buttons must be valid JSON.');
        $fields['buttons'] = $buttons;
    } elseif (is_array($buttons)) {
        $fields['buttons'] = json_encode($buttons, JSON_UNESCAPED_UNICODE);
    } else {
        $fields['buttons'] = null;
    }

    // Plan-gated automation options (Followers-only, Once/24h, Seen & Typing,
    // Share to Admin, No Watermark …). Sending an option the plan doesn't
    // include is rejected so the pricing table stays truthful.
    $opts = $in['options'] ?? null;
    if (is_string($opts) && trim($opts) !== '') {
        $opts = json_decode($opts, true);
        if (json_last_error() !== JSON_ERROR_NONE) fail('Options must be valid JSON.');
    }
    if (!is_array($opts)) $opts = [];
    $features = plan_features($uid);
    $optionFeatures = [
        'followers_only'   => 'followers_only',
        'once_per_user_24h'=> 'once_per_user_24h',
        'seen_typing'      => 'seen_typing',
        'no_watermark'     => 'no_watermark',
        'share_to_admin'   => $fields['type'] === 'reel' ? 'share_reel_to_admin' : 'share_post_to_admin',
    ];
    $cleanOpts = [];
    foreach ($optionFeatures as $optKey => $featKey) {
        $on = !empty($opts[$optKey]);
        if ($on && empty($features[$featKey])) {
            fail('"' . str_replace('_', ' ', $optKey) . '" is not included in your current plan. Upgrade to unlock it.', 403);
        }
        $cleanOpts[$optKey] = $on;
    }
    if (isset($opts['followers_only_message']) && $cleanOpts['followers_only']) {
        $cleanOpts['followers_only_message'] = mb_substr((string) $opts['followers_only_message'], 0, 500);
    }
    $fields['options'] = json_encode($cleanOpts, JSON_UNESCAPED_UNICODE);

    if ($fields['name'] === '') $fields['name'] = $fields['keyword'] !== '' ? $fields['keyword'] : ucfirst($fields['type']) . ' automation';
    if (isset($in['action']) && $in['action'] !== '') $fields['keyword'] = mb_substr($fields['keyword'], 0, 190);

    if ($id === null) {
        $sql = 'INSERT INTO automations (user_id, type, name, keyword, reply_text, public_reply, media_url, buttons, options, status)
                VALUES (:user_id, :type, :name, :keyword, :reply_text, :public_reply, :media_url, :buttons, :options, :status)';
        db()->prepare($sql)->execute([
            ':user_id' => $uid, ':type' => $fields['type'], ':name' => $fields['name'],
            ':keyword' => $fields['keyword'], ':reply_text' => $fields['reply_text'],
            ':public_reply' => $fields['public_reply'], ':media_url' => $fields['media_url'],
            ':buttons' => $fields['buttons'], ':options' => $fields['options'], ':status' => $fields['status'],
        ]);
        $id = (int) db()->lastInsertId();
    } else {
        $sql = 'UPDATE automations SET type=:type, name=:name, keyword=:keyword, reply_text=:reply_text,
                public_reply=:public_reply, media_url=:media_url, buttons=:buttons, options=:options, status=:status
                WHERE id=:id AND user_id=:user_id';
        db()->prepare($sql)->execute([
            ':type' => $fields['type'], ':name' => $fields['name'], ':keyword' => $fields['keyword'],
            ':reply_text' => $fields['reply_text'], ':public_reply' => $fields['public_reply'],
            ':media_url' => $fields['media_url'], ':buttons' => $fields['buttons'],
            ':options' => $fields['options'],
            ':status' => $fields['status'], ':id' => $id, ':user_id' => $uid,
        ]);
    }
    $st = db()->prepare('SELECT * FROM automations WHERE id = ? AND user_id = ?');
    $st->execute([$id, $uid]);
    $row = $st->fetch() ?: [];
    $row['id'] = (int) ($row['id'] ?? 0);
    if (isset($row['options']) && is_string($row['options'])) {
        $row['options'] = json_decode($row['options'], true) ?: [];
    }
    return $row;
}

function automations_out(array $rows): array
{
    foreach ($rows as &$r) {
        if (isset($r['options']) && is_string($r['options'])) {
            $r['options'] = json_decode($r['options'], true) ?: [];
        }
    }
    return $rows;
}

if ($path === '/api/automations' && $method === 'GET') {
    $uid = require_auth();
    $type = param('type');
    if ($type !== '') {
        $st = db()->prepare('SELECT * FROM automations WHERE user_id = ? AND type = ? ORDER BY id DESC');
        $st->execute([$uid, $type]);
    } else {
        $st = db()->prepare('SELECT * FROM automations WHERE user_id = ? ORDER BY id DESC');
        $st->execute([$uid]);
    }
    out(['automations' => automations_out($st->fetchAll())]);
}

if ($path === '/api/automations' && $method === 'POST') {
    $uid = require_auth();
    $in = json_in();
    $type = (string) ($in['type'] ?? 'dm');
    assert_plan_feature($uid, $type);
    out(['automation' => automation_payload($uid, $in)], 201);
}

if (preg_match('#^/api/automations/(\d+)$#', $path, $m) && $method === 'PUT') {
    $uid = require_auth();
    $id = (int) $m[1];
    $st = db()->prepare('SELECT id FROM automations WHERE id = ? AND user_id = ?');
    $st->execute([$id, $uid]);
    if (!$st->fetch()) fail('Automation not found.', 404);
    $in = json_in();
    $type = (string) ($in['type'] ?? 'dm');
    assert_plan_feature($uid, $type);
    out(['automation' => automation_payload($uid, $in, $id)]);
}

if (preg_match('#^/api/automations/(\d+)$#', $path, $m) && $method === 'DELETE') {
    $uid = require_auth();
    db()->prepare('DELETE FROM automations WHERE id = ? AND user_id = ?')->execute([(int) $m[1], $uid]);
    out(['ok' => true]);
}

/* ---------------------------------------------------------- my plan ---- */

if ($path === '/api/my-plan' && $method === 'GET') {
    $uid = require_auth();
    $st = db()->prepare('SELECT plan_code, plan_expires_at FROM users WHERE id = ?');
    $st->execute([$uid]);
    $u = $st->fetch() ?: ['plan_code' => 'free', 'plan_expires_at' => null];

    $st = db()->prepare('SELECT * FROM plans WHERE plan_code = ?');
    $st->execute([$u['plan_code'] ?: 'free']);
    $plan = $st->fetch() ?: null;
    if ($plan) {
        $plan['is_popular'] = (bool) $plan['is_popular'];
        $plan['price_monthly_inr'] = (int) $plan['price_monthly_inr'];
        $plan['price_yearly_inr'] = (int) $plan['price_yearly_inr'];
        $plan['price_yearly_monthly_inr'] = (int) $plan['price_yearly_monthly_inr'];
        $plan['feature_items'] = $plan['feature_items'] ? json_decode((string) $plan['feature_items'], true) : [];
    }

    $st = db()->prepare("SELECT COALESCE(SUM(messages_sent),0) m FROM daily_stats WHERE user_id = ? AND stat_day >= DATE_FORMAT(CURDATE(), '%Y-%m-01')");
    $st->execute([$uid]);
    $used = (int) ($st->fetch()['m'] ?? 0);

    $limit = $plan && is_numeric($plan['actions_per_month_limit']) ? (int) $plan['actions_per_month_limit'] : 0;
    $dailyLimit = $plan && is_numeric($plan['actions_per_day_limit']) ? (int) $plan['actions_per_day_limit'] : 0;
    $hourLimit = $plan && is_numeric($plan['actions_per_hour_limit']) ? (int) $plan['actions_per_hour_limit'] : 0;

    out([
        'plan' => $plan,
        'status' => 'active',
        'expires_at' => $u['plan_expires_at'],
        'usage' => [
            'monthly_used' => $used,
            'monthly_limit' => $limit,
            'daily_limit' => $dailyLimit ?: 'Unlimited',
            'hourly_limit' => $hourLimit ?: 'Meta rate limits',
        ],
    ]);
}

/* ------------------------------------------------------ transactions --- */

if ($path === '/api/transactions' && $method === 'GET') {
    $uid = require_auth();
    $st = db()->prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 100');
    $st->execute([$uid]);
    out(['transactions' => $st->fetchAll()]);
}

/* ---------------------------------------------------- instagram accs --- */

if ($path === '/api/instagram/accounts' && $method === 'GET') {
    $uid = require_auth();
    $st = db()->prepare('SELECT id, ig_user_id, username, account_type, status, connected_at FROM instagram_accounts WHERE user_id = ?');
    $st->execute([$uid]);
    out(['accounts' => $st->fetchAll()]);
}

if ($path === '/api/instagram/connect-url' && $method === 'GET') {
    require_auth();
    // Instagram OAuth would be configured here (Graph API + Instagram Login).
    fail('Instagram connection is not configured on this server. Add your Meta app credentials to enable it.', 501);
}

/* ------------------------------------------------------------- support - */

if ($path === '/api/support/tickets' && $method === 'GET') {
    $uid = require_auth();
    $st = db()->prepare('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY id DESC LIMIT 50');
    $st->execute([$uid]);
    out(['tickets' => $st->fetchAll()]);
}

if ($path === '/api/support/tickets' && $method === 'POST') {
    $uid = require_auth();
    $in = json_in();
    $subject = trim((string) ($in['subject'] ?? ''));
    $message = trim((string) ($in['message'] ?? ''));
    if ($subject === '') fail('Please add a subject.');
    if (strlen($message) < 10) fail('Please add at least 10 characters of detail.');

    // Priority Support (Basic/Pro): tickets from plans with the
    // priority_support feature are queued as priority.
    $priority = !empty(plan_features($uid)['priority_support']) ? 'priority' : 'normal';

    db()->prepare('INSERT INTO support_tickets (user_id, subject, message, priority) VALUES (?,?,?,?)')
        ->execute([$uid, $subject, $message, $priority]);
    $id = (int) db()->lastInsertId();
    $st = db()->prepare('SELECT * FROM support_tickets WHERE id = ?');
    $st->execute([$id]);
    out(['ticket' => $st->fetch()], 201);
}

/* ------------------------------------------------------- super profile - */

if ($path === '/api/superprofile' && $method === 'GET') {
    $uid = require_auth();
    $st = db()->prepare('SELECT * FROM super_profiles WHERE user_id = ?');
    $st->execute([$uid]);
    $p = $st->fetch();
    out(['profile' => $p ?: null]);
}

if (($path === '/api/superprofile') && ($method === 'POST' || $method === 'PUT')) {
    $uid = require_auth();
    assert_plan_feature($uid, 'super_profile');
    $in = json_in();
    $bio = (string) ($in['bio'] ?? '');
    $links = (string) ($in['links'] ?? '[]');
    json_decode($links, true);
    if (json_last_error() !== JSON_ERROR_NONE) fail('Links must be valid JSON.');

    $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', (string) (user_array($uid)['name'] ?? 'user') . '-' . $uid) ?: 'profile');

    $st = db()->prepare('SELECT id FROM super_profiles WHERE user_id = ?');
    $st->execute([$uid]);
    if ($st->fetch()) {
        db()->prepare('UPDATE super_profiles SET bio = ?, links = ? WHERE user_id = ?')->execute([$bio, $links, $uid]);
    } else {
        db()->prepare('INSERT INTO super_profiles (user_id, slug, bio, links) VALUES (?,?,?,?)')
            ->execute([$uid, $slug, $bio, $links]);
    }
    $st = db()->prepare('SELECT * FROM super_profiles WHERE user_id = ?');
    $st->execute([$uid]);
    out(['profile' => $st->fetch()]);
}

/* ------------------------------------------------------------- upload --- */
if ($path === '/api/upload' && $method === 'POST') {
    $uid = require_auth();
    if (!isset($_FILES['file']) || !is_array($_FILES['file'])) fail('No file uploaded.');
    $f = $_FILES['file'];
    if (($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) fail('Upload failed (code ' . (int) $f['error'] . ').');
    if (($f['size'] ?? 0) > 5 * 1024 * 1024) fail('File too large (max 5 MB).');
    $mime = function_exists('mime_content_type') ? (string) mime_content_type($f['tmp_name']) : (string) ($f['type'] ?? '');
    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
    if (!isset($allowed[$mime])) fail('Only JPG, PNG, WEBP or GIF images are allowed.');
    $dir = __DIR__ . '/uploads';
    if (!is_dir($dir)) @mkdir($dir, 0777, true);
    $name = bin2hex(random_bytes(8)) . '.' . $allowed[$mime];
    if (!move_uploaded_file($f['tmp_name'], $dir . '/' . $name)) fail('Could not save file.');
    out(['url' => '/uploads/' . $name]);
}

/* ------------------------------------------------------- site content -- */

if ($path === '/api/content' && $method === 'GET') {
    $rows = db()->query('SELECT content_key, content_value FROM site_content')->fetchAll();
    $out = [];
    foreach ($rows as $r) {
        $out[$r['content_key']] = json_decode((string) $r['content_value'], true);
    }
    out(['content' => $out]);
}

if (preg_match('#^/api/content/([a-z0-9_\-]+)$#', $path, $m) && $method === 'GET') {
    $st = db()->prepare('SELECT content_value FROM site_content WHERE content_key = ?');
    $st->execute([$m[1]]);
    $row = $st->fetch();
    if (!$row) fail('Content not found.', 404);
    out(['key' => $m[1], 'value' => json_decode((string) $row['content_value'], true)]);
}

/* ---------------------------------------------------------- payments --- */

// Public payment config (key id only — secret stays server-side).
if ($path === '/api/payments/config' && $method === 'GET') {
    out([
        'mode' => get_setting('payment_mode', 'demo'),
        'key_id' => get_setting('payment_key_id', ''),
        'currency' => get_setting('currency', 'INR'),
    ]);
}

// Create an order for a plan. Demo mode simulates the gateway instantly.
if ($path === '/api/payments/create-order' && $method === 'POST') {
    $uid = require_auth();
    $in = json_in();
    $planCode = (string) ($in['plan_code'] ?? '');
    $cycle = ($in['cycle'] ?? 'monthly') === 'yearly' ? 'yearly' : 'monthly';

    $st = db()->prepare('SELECT * FROM plans WHERE plan_code = ?');
    $st->execute([$planCode]);
    $plan = $st->fetch();
    if (!$plan) fail('Plan not found.', 404);
    if ($plan['plan_code'] === 'free') fail('The Free plan does not require payment.');

    $amount = $cycle === 'yearly' ? (int) $plan['price_yearly_inr'] : (int) $plan['price_monthly_inr'];
    if ($amount <= 0) fail('Invalid plan price.');

    $orderId = 'order_' . bin2hex(random_bytes(8));
    db()->prepare(
        'INSERT INTO transactions (user_id, plan_code, plan_name, amount, currency, method, payment_id, status)
         VALUES (?,?,?,?,?,?,?,\'pending\')'
    )->execute([
        $uid, $plan['plan_code'], $plan['name'], $amount,
        get_setting('currency', 'INR'), 'UPI', $orderId,
    ]);
    $txId = (int) db()->lastInsertId();

    out([
        'order_id' => $orderId,
        'transaction_id' => $txId,
        'amount' => $amount,
        'currency' => get_setting('currency', 'INR'),
        'plan_code' => $plan['plan_code'],
        'plan_name' => $plan['name'],
        'cycle' => $cycle,
        'mode' => get_setting('payment_mode', 'demo'),
        'key_id' => get_setting('payment_key_id', ''),
    ], 201);
}

// Verify payment and upgrade the plan.
// Demo mode: accepts any payment_id and upgrades immediately.
// Live mode: verify signature HMAC-SHA256(key_secret, order_id + '|' + payment_id).
if ($path === '/api/payments/verify' && $method === 'POST') {
    $uid = require_auth();
    $in = json_in();
    $orderId = (string) ($in['order_id'] ?? '');
    $paymentId = (string) ($in['payment_id'] ?? ('pay_' . bin2hex(random_bytes(8))));
    $signature = (string) ($in['signature'] ?? '');

    $st = db()->prepare('SELECT * FROM transactions WHERE user_id = ? AND payment_id = ? AND status = \'pending\' LIMIT 1');
    $st->execute([$uid, $orderId]);
    $tx = $st->fetch();
    if (!$tx) fail('Payment order not found or already processed.', 404);

    $mode = get_setting('payment_mode', 'demo');
    if ($mode === 'live') {
        $secret = get_setting('payment_key_secret', '');
        if ($secret === '' || $signature === '') fail('Payment signature missing.', 400);
        $expected = hash_hmac('sha256', $orderId . '|' . $paymentId, $secret);
        if (!hash_equals($expected, $signature)) fail('Payment signature verification failed.', 400);
    }

    db()->prepare('UPDATE transactions SET payment_id = ?, status = \'success\' WHERE id = ?')
        ->execute([$paymentId, $tx['id']]);

    // Upgrade the user's plan (duration depends on monthly vs yearly amount).
    $st = db()->prepare('SELECT price_yearly_inr, duration_days_monthly, duration_days_yearly FROM plans WHERE plan_code = ?');
    $st->execute([$tx['plan_code']]);
    $p2 = $st->fetch();
    $days = 30;
    if ($p2) {
        $days = ((int) $tx['amount'] === (int) $p2['price_yearly_inr'])
            ? (int) $p2['duration_days_yearly']
            : (int) $p2['duration_days_monthly'];
    }
    $expires = date('Y-m-d H:i:s', time() + max(1, $days) * 86400);
    db()->prepare('UPDATE users SET plan_code = ?, plan_expires_at = ? WHERE id = ?')
        ->execute([$tx['plan_code'], $expires, $uid]);

    out([
        'ok' => true,
        'message' => 'Payment successful! Your plan has been upgraded.',
        'plan_code' => $tx['plan_code'],
        'expires_at' => $expires,
        'transaction_id' => (int) $tx['id'],
    ]);
}

/* ------------------------------------------------------------- admin ---- */

// Admin dashboard stats
if ($path === '/api/admin/stats' && $method === 'GET') {
    require_admin();
    $q = static function (string $sql, array $params = []) {
        $st = db()->prepare($sql);
        $st->execute($params);
        return $st->fetchColumn();
    };
    out(['stats' => [
        'users_total' => (int) $q('SELECT COUNT(*) FROM users'),
        'users_active' => (int) $q("SELECT COUNT(*) FROM users WHERE status = 'active'"),
        'users_admin' => (int) $q("SELECT COUNT(*) FROM users WHERE role = 'admin'"),
        'revenue_total' => (int) $q("SELECT COALESCE(SUM(amount),0) FROM transactions WHERE status = 'success'"),
        'revenue_month' => (int) $q("SELECT COALESCE(SUM(amount),0) FROM transactions WHERE status = 'success' AND created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')"),
        'transactions_pending' => (int) $q("SELECT COUNT(*) FROM transactions WHERE status = 'pending'"),
        'plans_count' => (int) $q('SELECT COUNT(*) FROM plans'),
        'blog_posts' => (int) $q("SELECT COUNT(*) FROM blog_posts WHERE status = 'published'"),
        'tickets_open' => (int) $q("SELECT COUNT(*) FROM support_tickets WHERE status = 'open'"),
        'contact_new' => (int) $q("SELECT COUNT(*) FROM contact_messages WHERE status = 'new'"),
        'automations_total' => (int) $q('SELECT COUNT(*) FROM automations'),
        'automations_active' => (int) $q("SELECT COUNT(*) FROM automations WHERE status = 'active'"),
        'messages_sent' => (int) $q('SELECT COALESCE(SUM(messages_sent),0) FROM daily_stats'),
        'content_keys' => (int) $q('SELECT COUNT(*) FROM site_content'),
    ]]);
}

// Users list + management
if ($path === '/api/admin/users' && $method === 'GET') {
    require_admin();
    $q = trim((string) ($_GET['q'] ?? ''));
    if ($q !== '') {
        $st = db()->prepare("SELECT id, name, email, role, plan_code, status, created_at FROM users WHERE name LIKE ? OR email LIKE ? ORDER BY id DESC LIMIT 200");
        $like = "%{$q}%";
        $st->execute([$like, $like]);
    } else {
        $st = db()->query('SELECT id, name, email, role, plan_code, status, created_at FROM users ORDER BY id DESC LIMIT 200');
        $st->execute();
    }
    out(['users' => $st->fetchAll()]);
}

if (preg_match('#^/api/admin/users/(\d+)$#', $path, $m) && $method === 'PUT') {
    $adminId = require_admin();
    $id = (int) $m[1];
    if ($id === $adminId) fail('You cannot change your own record here.');
    $in = json_in();
    $fields = [];
    $params = [];
    if (isset($in['status']) && in_array($in['status'], ['active', 'blocked', 'deleted'], true)) {
        $fields[] = 'status = ?';
        $params[] = $in['status'];
    }
    if (isset($in['role']) && in_array($in['role'], ['user', 'admin'], true)) {
        $fields[] = 'role = ?';
        $params[] = $in['role'];
    }
    if (isset($in['plan_code'])) {
        $st = db()->prepare('SELECT plan_code FROM plans WHERE plan_code = ?');
        $st->execute([(string) $in['plan_code']]);
        if (!$st->fetch()) fail('Unknown plan.');
        $fields[] = 'plan_code = ?';
        $params[] = (string) $in['plan_code'];
    }
    if (!$fields) fail('Nothing to update.');
    $params[] = $id;
    db()->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);

    $st = db()->prepare('SELECT id, name, email, role, plan_code, status, created_at FROM users WHERE id = ?');
    $st->execute([$id]);
    out(['user' => $st->fetch()]);
}

if (preg_match('#^/api/admin/users/(\d+)$#', $path, $m) && $method === 'DELETE') {
    $adminId = require_admin();
    $id = (int) $m[1];
    if ($id === $adminId) fail('You cannot delete your own account.');
    db()->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
    out(['ok' => true]);
}

// Plans management
if ($path === '/api/admin/plans' && $method === 'GET') {
    require_admin();
    out(['plans' => db()->query('SELECT * FROM plans ORDER BY display_order ASC')->fetchAll()]);
}

if ($path === '/api/admin/plans' && $method === 'POST') {
    require_admin();
    $in = json_in();
    $code = strtolower(trim((string) ($in['plan_code'] ?? '')));
    $name = trim((string) ($in['name'] ?? ''));
    if ($code === '' || $name === '') fail('plan_code and name are required.');
    $st = db()->prepare('SELECT id FROM plans WHERE plan_code = ?');
    $st->execute([$code]);
    if ($st->fetch()) fail('Plan already exists.');

    db()->prepare(
        'INSERT INTO plans (plan_code, name, display_order, button_text, is_popular, is_custom,
            price_monthly_inr, price_yearly_inr, price_yearly_monthly_inr,
            actions_per_hour_limit, actions_per_day_limit, actions_per_month_limit, feature_items, comparison)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    )->execute([
        $code, $name, (int) ($in['display_order'] ?? 99), (string) ($in['button_text'] ?? 'Choose Plan'),
        !empty($in['is_popular']) ? 1 : 0, !empty($in['is_custom']) ? 1 : 0,
        (int) ($in['price_monthly_inr'] ?? 0), (int) ($in['price_yearly_inr'] ?? 0), (int) ($in['price_yearly_monthly_inr'] ?? 0),
        (string) ($in['actions_per_hour_limit'] ?? '100'), (string) ($in['actions_per_day_limit'] ?? '100'),
        (string) ($in['actions_per_month_limit'] ?? '1000'),
        isset($in['feature_items']) ? json_encode($in['feature_items'], JSON_UNESCAPED_UNICODE) : null,
        isset($in['comparison']) ? json_encode($in['comparison'], JSON_UNESCAPED_UNICODE) : null,
    ]);
    out(['id' => (int) db()->lastInsertId()], 201);
}

if (preg_match('#^/api/admin/plans/(\d+)$#', $path, $m) && $method === 'PUT') {
    require_admin();
    $id = (int) $m[1];
    $in = json_in();
    $map = [
        'name' => 'name', 'display_order' => 'display_order', 'button_text' => 'button_text',
        'price_monthly_inr' => 'price_monthly_inr', 'price_yearly_inr' => 'price_yearly_inr',
        'price_yearly_monthly_inr' => 'price_yearly_monthly_inr',
        'actions_per_hour_limit' => 'actions_per_hour_limit', 'actions_per_day_limit' => 'actions_per_day_limit',
        'actions_per_month_limit' => 'actions_per_month_limit', 'yearly_bonus' => 'yearly_bonus',
    ];
    $fields = [];
    $params = [];
    foreach ($map as $inKey => $col) {
        if (array_key_exists($inKey, $in)) {
            $fields[] = "{$col} = ?";
            $params[] = is_int($in[$inKey]) || is_float($in[$inKey]) ? $in[$inKey] : (string) $in[$inKey];
        }
    }
    foreach (['is_popular', 'is_custom'] as $flag) {
        if (array_key_exists($flag, $in)) {
            $fields[] = "{$flag} = ?";
            $params[] = !empty($in[$flag]) ? 1 : 0;
        }
    }
    foreach (['feature_items', 'comparison'] as $jsonCol) {
        if (array_key_exists($jsonCol, $in)) {
            $fields[] = "{$jsonCol} = ?";
            $params[] = is_string($in[$jsonCol]) ? $in[$jsonCol] : json_encode($in[$jsonCol], JSON_UNESCAPED_UNICODE);
        }
    }
    if (!$fields) fail('Nothing to update.');
    $params[] = $id;
    db()->prepare('UPDATE plans SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
    $st = db()->prepare('SELECT * FROM plans WHERE id = ?');
    $st->execute([$id]);
    out(['plan' => $st->fetch()]);
}

if (preg_match('#^/api/admin/plans/(\d+)$#', $path, $m) && $method === 'DELETE') {
    require_admin();
    $id = (int) $m[1];
    $st = db()->prepare('SELECT plan_code FROM plans WHERE id = ?');
    $st->execute([$id]);
    $plan = $st->fetch();
    if (!$plan) fail('Plan not found.', 404);
    if (in_array($plan['plan_code'], ['free', 'basic', 'pro'], true)) {
        fail('Built-in plans cannot be deleted. Edit them instead.');
    }
    $used = db()->prepare('SELECT COUNT(*) FROM users WHERE plan_code = ?');
    $used->execute([$plan['plan_code']]);
    if ((int) $used->fetchColumn() > 0) {
        fail('Plan is assigned to users and cannot be deleted.');
    }
    db()->prepare('DELETE FROM plans WHERE id = ?')->execute([$id]);
    out(['ok' => true]);
}

// Blog management
if ($path === '/api/admin/blog' && $method === 'GET') {
    require_admin();
    out(['posts' => db()->query('SELECT * FROM blog_posts ORDER BY published_at DESC')->fetchAll()]);
}

if ($path === '/api/admin/blog' && $method === 'POST') {
    require_admin();
    $in = json_in();
    $slug = strtolower(trim((string) ($in['slug'] ?? '')));
    $title = trim((string) ($in['title'] ?? ''));
    if ($slug === '' || $title === '') fail('slug and title are required.');
    $st = db()->prepare('SELECT id FROM blog_posts WHERE slug = ?');
    $st->execute([$slug]);
    if ($st->fetch()) fail('Slug already exists.');

    db()->prepare(
        'INSERT INTO blog_posts (slug, title, excerpt, content, category, cover_image, featured, status, published_at)
         VALUES (?,?,?,?,?,?,?,?,?)'
    )->execute([
        $slug, $title, (string) ($in['excerpt'] ?? ''), (string) ($in['content'] ?? ''),
        (string) ($in['category'] ?? 'Instagram Automation'), (string) ($in['cover_image'] ?? ''),
        !empty($in['featured']) ? 1 : 0, ($in['status'] ?? 'published') === 'draft' ? 'draft' : 'published',
        (string) ($in['published_at'] ?? date('Y-m-d H:i:s')),
    ]);
    out(['id' => (int) db()->lastInsertId()], 201);
}

if (preg_match('#^/api/admin/blog/(\d+)$#', $path, $m) && $method === 'PUT') {
    require_admin();
    $id = (int) $m[1];
    $in = json_in();
    $map = ['slug' => 'slug', 'title' => 'title', 'excerpt' => 'excerpt', 'content' => 'content',
            'category' => 'category', 'cover_image' => 'cover_image', 'status' => 'status',
            'published_at' => 'published_at'];
    $fields = [];
    $params = [];
    foreach ($map as $k => $col) {
        if (array_key_exists($k, $in)) {
            $fields[] = "{$col} = ?";
            $params[] = (string) $in[$k];
        }
    }
    if (array_key_exists('featured', $in)) {
        $fields[] = 'featured = ?';
        $params[] = !empty($in['featured']) ? 1 : 0;
    }
    if (!$fields) fail('Nothing to update.');
    $params[] = $id;
    db()->prepare('UPDATE blog_posts SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
    $st = db()->prepare('SELECT * FROM blog_posts WHERE id = ?');
    $st->execute([$id]);
    out(['post' => $st->fetch()]);
}

if (preg_match('#^/api/admin/blog/(\d+)$#', $path, $m) && $method === 'DELETE') {
    require_admin();
    db()->prepare('DELETE FROM blog_posts WHERE id = ?')->execute([(int) $m[1]]);
    out(['ok' => true]);
}

// Transactions (all users)
if ($path === '/api/admin/transactions' && $method === 'GET') {
    require_admin();
    out(['transactions' => db()->query(
        'SELECT t.*, u.email AS user_email, u.name AS user_name
           FROM transactions t LEFT JOIN users u ON u.id = t.user_id
          ORDER BY t.id DESC LIMIT 300'
    )->fetchAll()]);
}

if (preg_match('#^/api/admin/transactions/(\d+)$#', $path, $m) && $method === 'PUT') {
    require_admin();
    $in = json_in();
    $status = (string) ($in['status'] ?? '');
    if (!in_array($status, ['pending', 'success', 'failed', 'refunded'], true)) fail('Invalid status.');
    db()->prepare('UPDATE transactions SET status = ? WHERE id = ?')->execute([$status, (int) $m[1]]);
    out(['ok' => true]);
}

// Support tickets (all users)
if ($path === '/api/admin/tickets' && $method === 'GET') {
    require_admin();
    out(['tickets' => db()->query(
        'SELECT t.*, u.email AS user_email, u.name AS user_name
           FROM support_tickets t LEFT JOIN users u ON u.id = t.user_id
          ORDER BY t.id DESC LIMIT 300'
    )->fetchAll()]);
}

if (preg_match('#^/api/admin/tickets/(\d+)$#', $path, $m) && $method === 'PUT') {
    require_admin();
    $in = json_in();
    $status = (string) ($in['status'] ?? '');
    if (!in_array($status, ['open', 'pending', 'resolved'], true)) fail('Invalid status.');
    db()->prepare('UPDATE support_tickets SET status = ? WHERE id = ?')->execute([$status, (int) $m[1]]);
    out(['ok' => true]);
}

// Contact messages
if ($path === '/api/admin/contact' && $method === 'GET') {
    require_admin();
    out(['messages' => db()->query('SELECT * FROM contact_messages ORDER BY id DESC LIMIT 300')->fetchAll()]);
}

if (preg_match('#^/api/admin/contact/(\d+)$#', $path, $m) && $method === 'PUT') {
    require_admin();
    $in = json_in();
    $status = (string) ($in['status'] ?? '');
    if (!in_array($status, ['new', 'read', 'replied'], true)) fail('Invalid status.');
    db()->prepare('UPDATE contact_messages SET status = ? WHERE id = ?')->execute([$status, (int) $m[1]]);
    out(['ok' => true]);
}

// Site content (editable marketing copy)
if ($path === '/api/admin/content' && $method === 'GET') {
    require_admin();
    $rows = db()->query('SELECT content_key, content_value, updated_at FROM site_content ORDER BY content_key')->fetchAll();
    $out = [];
    foreach ($rows as $r) {
        $out[] = ['key' => $r['content_key'], 'value' => json_decode((string) $r['content_value'], true), 'updated_at' => $r['updated_at']];
    }
    out(['content' => $out]);
}

if ($path === '/api/admin/content' && $method === 'PUT') {
    require_admin();
    $in = json_in();
    $key = (string) ($in['key'] ?? '');
    if ($key === '' || !array_key_exists('value', $in)) fail('key and value are required.');
    db()->prepare(
        'INSERT INTO site_content (content_key, content_value) VALUES (?,?)
         ON DUPLICATE KEY UPDATE content_value = VALUES(content_value)'
    )->execute([$key, json_encode($in['value'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
    out(['ok' => true]);
}

// Settings (payment keys etc.)
if ($path === '/api/admin/settings' && $method === 'GET') {
    require_admin();
    out(['settings' => [
        'payment_key_id' => get_setting('payment_key_id', ''),
        // secret masked in the response
        'payment_key_secret_set' => get_setting('payment_key_secret', '') !== '',
        'payment_mode' => get_setting('payment_mode', 'demo'),
        'currency' => get_setting('currency', 'INR'),
    ]]);
}

if ($path === '/api/admin/settings' && $method === 'PUT') {
    require_admin();
    $in = json_in();
    if (array_key_exists('payment_key_id', $in)) set_setting('payment_key_id', (string) $in['payment_key_id']);
    if (array_key_exists('payment_key_secret', $in) && (string) $in['payment_key_secret'] !== '') {
        set_setting('payment_key_secret', (string) $in['payment_key_secret']);
    }
    if (array_key_exists('payment_mode', $in) && in_array($in['payment_mode'], ['demo', 'live'], true)) {
        set_setting('payment_mode', (string) $in['payment_mode']);
    }
    if (array_key_exists('currency', $in)) set_setting('currency', (string) $in['currency']);
    out(['ok' => true]);
}

// Automations (all users, for admin moderation)
if ($path === '/api/admin/automations' && $method === 'GET') {
    require_admin();
    out(['automations' => db()->query(
        'SELECT a.*, u.email AS user_email FROM automations a
           LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 300'
    )->fetchAll()]);
}

/* ------------------------------------------------------------- 404 ----- */

out(['error' => 'Endpoint not found: ' . $path], 404);
