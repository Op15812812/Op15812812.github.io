<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');
header('Access-Control-Allow-Headers: Content-Type');

$host = 'localhost';
$dbname = 'carbon_tracker';
$username = 'root'; // XAMPP 預設 MySQL 使用者
$password = ''; // XAMPP 預設 MySQL 密碼（空）

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("SET CHARACTER SET utf8mb4");

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $transport = $data['transport'] ?? '';
        $distance = floatval($data['distance'] ?? 0);
        $footprint = floatval($data['footprint'] ?? 0);
        $points = intval($data['points'] ?? 0); // 接收前端傳來的 points

        if (empty($transport)) {
            echo json_encode(['status' => 'error', 'message' => '輸入無效']);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO travel_records (record_time, transport, distance, footprint, points) VALUES (NOW(), ?, ?, ?, ?)");
        $stmt->execute([$transport, $distance, $footprint, $points]);

        echo json_encode(['status' => 'success']);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $pdo->query("SELECT * FROM travel_records ORDER BY record_time DESC");
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($records);
        exit;
    } else {
        echo json_encode(['status' => 'error', 'message' => '無效的請求方式']);
    }
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => '資料庫錯誤: ' . $e->getMessage()]);
}
?>