<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $transport = $_POST['transport'];
  $distance = floatval($_POST['distance']);
  $fp = fopen('data.csv', 'a');
  fputcsv($fp, [date('Y-m-d H:i:s'), $transport, $distance]);
  fclose($fp);
  echo json_encode(['status' => 'success']);
  exit;
}
?>
