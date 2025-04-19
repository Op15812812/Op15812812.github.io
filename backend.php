<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');
header('Access-Control-Allow-Headers: Content-Type');

session_start();

$host = 'localhost';
$dbname = 'carbon_tracker';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("SET CHARACTER SET utf8mb4");

    $user_id = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';

        if ($action === 'register') {
            $username = $data['username'] ?? '';
            $password = $data['password'] ?? '';
            if (empty($username) || empty($password)) {
                echo json_encode(['status' => 'error', 'message' => '使用者名稱或密碼不能為空']);
                exit;
            }
            $hashed_password = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
            try {
                $stmt->execute([$username, $hashed_password]);
                echo json_encode(['status' => 'success']);
            } catch (PDOException $e) {
                echo json_encode(['status' => 'error', 'message' => '使用者名稱已存在']);
            }
            exit;
        }

        if ($action === 'login') {
            $username = $data['username'] ?? '';
            $password = $data['password'] ?? '';
            if (empty($username) || empty($password)) {
                echo json_encode(['status' => 'error', 'message' => '使用者名稱或密碼不能為空']);
                exit;
            }
            $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
            $stmt->execute([$username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($user && password_verify($password, $user['password'])) {
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                echo json_encode(['status' => 'success', 'username' => $user['username']]);
            } else {
                echo json_encode(['status' => 'error', 'message' => '使用者名稱或密碼錯誤']);
            }
            exit;
        }

        if ($action === 'logout') {
            session_destroy();
            echo json_encode(['status' => 'success']);
            exit;
        }

        if ($action === 'record') {
            if (!$user_id) {
                echo json_encode(['status' => 'error', 'message' => '請先登入']);
                exit;
            }

            $transport = $data['transport'] ?? '';
            $distance = floatval($data['distance'] ?? 0);
            $footprint = floatval($data['footprint'] ?? 0);
            $points = intval($data['points'] ?? 0);

            if (empty($transport)) {
                echo json_encode(['status' => 'error', 'message' => '輸入無效']);
                exit;
            }

            $stmt = $pdo->prepare("INSERT INTO travel_records (user_id, record_time, transport, distance, footprint, points) VALUES (?, NOW(), ?, ?, ?, ?)");
            $stmt->execute([$user_id, $transport, $distance, $footprint, $points]);

            $stmt = $pdo->prepare("UPDATE users SET total_points = total_points + ?, total_footprint = total_footprint + ? WHERE id = ?");
            $stmt->execute([$points, $footprint, $user_id]);

            echo json_encode(['status' => 'success']);
            exit;
        }

        if ($action === 'redeem') {
            if (!$user_id) {
                echo json_encode(['status' => 'error', 'message' => '請先登入']);
                exit;
            }
            $reward_id = intval($data['reward_id'] ?? 0);
            $stmt = $pdo->prepare("SELECT points_required FROM rewards WHERE id = ?");
            $stmt->execute([$reward_id]);
            $reward = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$reward) {
                echo json_encode(['status' => 'error', 'message' => '獎勵不存在']);
                exit;
            }

            $points_required = $reward['points_required'];
            $stmt = $pdo->prepare("SELECT total_points FROM users WHERE id = ?");
            $stmt->execute([$user_id]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user['total_points'] < $points_required) {
                echo json_encode(['status' => 'error', 'message' => '點數不足']);
                exit;
            }

            $stmt = $pdo->prepare("UPDATE users SET total_points = total_points - ? WHERE id = ?");
            $stmt->execute([$points_required, $user_id]);
            echo json_encode(['status' => 'success', 'message' => '兌換成功']);
            exit;
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? '';

        if ($action === 'check_login') {
            if ($user_id) {
                echo json_encode(['status' => 'success', 'username' => $_SESSION['username']]);
            } else {
                echo json_encode(['status' => 'error']);
            }
            exit;
        }

        if ($action === 'history') {
            if (!$user_id) {
                echo json_encode(['status' => 'error', 'message' => '請先登入']);
                exit;
            }
            $stmt = $pdo->prepare("SELECT * FROM travel_records WHERE user_id = ? ORDER BY record_time DESC");
            $stmt->execute([$user_id]);
            $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($records);
            exit;
        }

        if ($action === 'leaderboard') {
            $stmt = $pdo->query("SELECT username, total_points, total_footprint FROM users ORDER BY total_points DESC LIMIT 10");
            $leaderboard = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($leaderboard);
            exit;
        }

        if ($action === 'rewards') {
            $stmt = $pdo->query("SELECT * FROM rewards");
            $rewards = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($rewards);
            exit;
        }

        if ($action === 'user_points') {
            if (!$user_id) {
                echo json_encode(['status' => 'error', 'message' => '請先登入']);
                exit;
            }
            $stmt = $pdo->prepare("SELECT total_points FROM users WHERE id = ?");
            $stmt->execute([$user_id]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(['status' => 'success', 'points' => $user['total_points']]);
            exit;
        }
    }

    echo json_encode(['status' => 'error', 'message' => '無效的請求方式']);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => '資料庫錯誤: ' . $e->getMessage()]);
}
?>