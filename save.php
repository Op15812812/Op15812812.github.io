<?php
header('Content-Type: application/json');

$host = 'localhost';
$dbname = 'carbon_tracker';
$user = 'root';
$pass = '';

try {
  $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $user, $pass);
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $transport = $_POST['transport'] ?? '';
    $distance = floatval($_POST['distance'] ?? 0);
    $footprint = floatval($_POST['footprint'] ?? 0);

    $stmt = $pdo->prepare("INSERT INTO records (transport, distance, footprint, created_at) VALUES (?, ?, ?, NOW())");
    $stmt->execute([$transport, $distance, $footprint]);

    echo json_encode(['status' => 'success']);
  } else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request']);
  }
} catch (PDOException $e) {
  echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
