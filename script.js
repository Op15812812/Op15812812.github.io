const transportOptions = ["步行", "腳踏車", "機車", "汽車", "大眾運輸"];
let selectedTransport = "";
let history = [];
let points = 0;
let watchId = null;
let positions = [];
let map, directionsService, directionsRenderer;
let startMarker = null, endMarker = null;

window.onload = () => {
  checkLoginStatus();
};

function checkLoginStatus() {
  fetch('backend.php?action=check_login', { method: 'GET' })
    .then(response => {
      console.log("檢查登入狀態 - HTTP 狀態碼：", response.status);
      return response.json();
    })
    .then(data => {
      console.log("檢查登入狀態 - 後端回應：", data);
      if (data.status === 'success') {
        showUserInfo(data.username);
        loadHistory();
        loadLeaderboard();
        loadRewards();
        document.getElementById('tracking-section').classList.remove('d-none');
        document.getElementById('history-section').classList.remove('d-none');
        document.getElementById('leaderboard-section').classList.remove('d-none');
        document.getElementById('rewards-section').classList.remove('d-none');
        setupTransportButtons();
      } else {
        showLoginForm();
      }
    })
    .catch(error => console.error('檢查登入狀態失敗:', error));
}

function setupTransportButtons() {
  const container = document.getElementById("transport-options");
  transportOptions.forEach(option => {
    const btn = document.createElement("button");
    btn.className = "btn btn-outline-success m-1 transport-btn";
    btn.textContent = option;
    btn.onclick = () => {
      document.querySelectorAll('.transport-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add("active");
      selectedTransport = option;
    };
    container.appendChild(btn);
  });
}

function showLoginForm() {
  document.getElementById('login-form').classList.remove('d-none');
  document.getElementById('register-form').classList.add('d-none');
  document.getElementById('user-info').classList.add('d-none');
}

function showRegisterForm() {
  document.getElementById('login-form').classList.add('d-none');
  document.getElementById('register-form').classList.remove('d-none');
  document.getElementById('user-info').classList.add('d-none');
}

function showUserInfo(username) {
  document.getElementById('login-form').classList.add('d-none');
  document.getElementById('register-form').classList.add('d-none');
  document.getElementById('user-info').classList.remove('d-none');
  document.getElementById('username-display').textContent = username;
}

function login() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  fetch('backend.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', username, password })
  })
  .then(response => {
    console.log("登入 - HTTP 狀態碼：", response.status);
    return response.json();
  })
  .then(data => {
    console.log("登入 - 後端回應：", data);
    if (data.status === 'success') {
      showUserInfo(data.username);
      location.reload();
    } else {
      alert(data.message);
    }
  })
  .catch(error => console.error('登入失敗:', error));
}

function register() {
  const username = document.getElementById('register-username').value;
  const password = document.getElementById('register-password').value;
  fetch('backend.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'register', username, password })
  })
  .then(response => {
    console.log("註冊 - HTTP 狀態碼：", response.status);
    return response.json();
  })
  .then(data => {
    console.log("註冊 - 後端回應：", data);
    if (data.status === 'success') {
      alert('註冊成功，請登入');
      showLoginForm();
    } else {
      alert(data.message);
    }
  })
  .catch(error => console.error('註冊失敗:', error));
}

function logout() {
  fetch('backend.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'logout' })
  })
  .then(response => {
    console.log("登出 - HTTP 狀態碼：", response.status);
    return response.json();
  })
  .then(data => {
    console.log("登出 - 後端回應：", data);
    if (data.status === 'success') {
      location.reload();
    }
  })
  .catch(error => console.error('登出失敗:', error));
}

function calculateFootprint(transport, dist) {
  const factors = {
    "步行": 0,
    "腳踏車": 0.01,
    "機車": 0.1,
    "汽車": 0.2,
    "大眾運輸": 0.05
  };
  return dist * factors[transport];
}

function calculatePoints(transport, dist) {
  let pointsEarned = 0;
  if (transport === "步行") {
    pointsEarned = 3 + Math.floor(dist / 0.5);
  } else if (transport === "腳踏車") {
    pointsEarned = 2 + Math.floor(dist / 1);
  } else if (transport === "大眾運輸") {
    pointsEarned = 1 + Math.floor(dist / 5);
  }
  return pointsEarned;
}

function handleSubmit() {
  const dist = parseFloat(document.getElementById("distance").value);
  if (!selectedTransport || isNaN(dist)) return alert("請選擇交通方式並輸入有效的距離。");

  const footprint = calculateFootprint(selectedTransport, dist);
  const pointsEarned = calculatePoints(selectedTransport, dist);

  const record = {
    transport: selectedTransport,
    distance: dist,
    footprint: footprint,
    points: pointsEarned,
    record_time: new Date().toISOString()
  };
  history.unshift(record);

  console.log("發送資料：", record);

  fetch('backend.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'record',
      transport: selectedTransport,
      distance: dist,
      footprint: footprint,
      points: pointsEarned
    })
  })
  .then(response => {
    console.log("儲存紀錄 - HTTP 狀態碼：", response.status);
    return response.json();
  })
  .then(data => {
    console.log('儲存紀錄 - 後端回應：', data);
    if (data.status === 'success') {
      console.log('資料儲存成功');
      loadHistory();
      alert(`這次${selectedTransport}移動獲得 ${pointsEarned} 點！`);
    } else {
      console.error('儲存資料失敗:', data.message);
      alert('儲存資料失敗：' + data.message);
    }
  })
  .catch(error => {
    console.error('傳送錯誤:', error);
    alert('無法連接到後端，請檢查伺服器是否運行');
  });

  updateUI();
  suggestEcoPath(selectedTransport);
  document.getElementById("distance").value = "";
}

function startTracking() {
  if (!selectedTransport) return alert("請先選擇交通方式。");
  positions = [];
  watchId = navigator.geolocation.watchPosition(pos => {
    positions.push({
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      time: Date.now()
    });
    console.log("收到位置：", pos.coords.latitude, pos.coords.longitude);
  }, err => {
    alert("無法取得位置資訊: " + err.message);
  }, { enableHighAccuracy: true });
}

function stopTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;

    let totalDistance = 0;
    for (let i = 1; i < positions.length; i++) {
      totalDistance += haversineDistance(positions[i - 1], positions[i]);
    }
    totalDistance = parseFloat(totalDistance.toFixed(3));

    const footprint = calculateFootprint(selectedTransport, totalDistance);
    const pointsEarned = calculatePoints(selectedTransport, totalDistance);

    const record = {
      transport: selectedTransport,
      distance: totalDistance,
      footprint: footprint,
      points: pointsEarned,
      record_time: new Date().toISOString()
    };
    history.unshift(record);

    console.log("發送資料：", record);

    fetch('backend.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'record',
        transport: selectedTransport,
        distance: totalDistance,
        footprint: footprint,
        points: pointsEarned
      })
    })
    .then(response => {
      console.log("儲存紀錄 - HTTP 狀態碼：", response.status);
      return response.json();
    })
    .then(data => {
      console.log('儲存紀錄 - 後端回應：', data);
      if (data.status === 'success') {
        console.log('資料儲存成功');
        loadHistory();
        alert(`這次${selectedTransport}移動獲得 ${pointsEarned} 點！`);
      } else {
        console.error('儲存資料失敗:', data.message);
        alert('儲存資料失敗：' + data.message);
      }
    })
    .catch(error => {
      console.error('傳送錯誤:', error);
      alert('無法連接到後端，請檢查伺服器是否運行');
    });

    updateUI();
    suggestEcoPath(selectedTransport);
  }
}

function haversineDistance(p1, p2) {
  const R = 6371;
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(p2.lat - p1.lat);
  const dLon = toRad(p2.lon - p1.lon);
  const lat1 = toRad(p1.lat);
  const lat2 = toRad(p2.lat);

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function updateUI() {
  fetch('backend.php?action=user_points', { method: 'GET' })
    .then(response => {
      console.log("獲取點數 - HTTP 狀態碼：", response.status);
      return response.json();
    })
    .then(data => {
      console.log("獲取點數 - 後端回應：", data);
      if (data.status === 'success') {
        points = data.points;
        document.getElementById("points").textContent = points;
      } else {
        console.error('獲取點數失敗:', data.message);
      }
    })
    .catch(error => console.error('獲取點數失敗:', error));

  const list = document.getElementById("history-list");
  list.innerHTML = "";
  history.forEach(record => {
    const li = document.createElement("li");
    li.className = "list-group-item";
    const time = new Date(record.record_time).toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    li.textContent = `${time} - ${record.transport} - ${record.distance} 公里 - 碳排放 ${record.footprint.toFixed(2)} kg CO₂ - 獲得 ${record.points} 點`;
    list.appendChild(li);
  });
}

function suggestEcoPath(transport) {
  const suggestion = document.getElementById("eco-suggestion");
  if (["汽車", "機車"].includes(transport)) {
    suggestion.textContent = "建議改為搭乘大眾運輸或腳踏車，降低碳排放。";
  } else {
    suggestion.textContent = "你選擇了很環保的交通方式，繼續保持！";
  }
  suggestion.classList.remove("d-none");
}

function loadHistory() {
  fetch('backend.php?action=history', { method: 'GET' })
    .then(response => {
      console.log("載入歷史紀錄 - HTTP 狀態碼：", response.status);
      return response.json();
    })
    .then(records => {
      console.log("載入歷史紀錄 - 後端回應：", records);
      history = records.map(record => ({
        transport: record.transport,
        distance: record.distance,
        footprint: record.footprint,
        points: record.points,
        record_time: record.record_time
      }));
      updateUI();
    })
    .catch(error => console.error('載入歷史紀錄失敗:', error));
}

function loadLeaderboard() {
  fetch('backend.php?action=leaderboard', { method: 'GET' })
    .then(response => {
      console.log("載入排行榜 - HTTP 狀態碼：", response.status);
      return response.json();
    })
    .then(leaderboard => {
      console.log("載入排行榜 - 後端回應：", leaderboard);
      const list = document.getElementById("leaderboard-list");
      list.innerHTML = "";
      leaderboard.forEach((user, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${index + 1}</td>
          <td>${user.username}</td>
          <td>${user.total_points}</td>
          <td>${user.total_footprint.toFixed(2)}</td>
        `;
        list.appendChild(tr);
      });
    })
    .catch(error => console.error('載入排行榜失敗:', error));
}

function loadRewards() {
  fetch('backend.php?action=rewards', { method: 'GET' })
    .then(response => {
      console.log("載入獎勵 - HTTP 狀態碼：", response.status);
      return response.json();
    })
    .then(records => {
      console.log("載入獎勵 - 後端回應：", records);
      const list = document.getElementById("rewards-list");
      list.innerHTML = "";
      records.forEach(reward => {
        const div = document.createElement("div");
        div.className = "card mb-2";
        div.innerHTML = `
          <div class="card-body">
            <h6 class="card-title">${reward.name}</h6>
            <p class="card-text">需要 ${reward.points_required} 點</p>
            <p class="card-text">${reward.description}</p>
            <button class="btn btn-primary" onclick="redeemReward(${reward.id})">兌換</button>
          </div>
        `;
        list.appendChild(div);
      });
    })
    .catch(error => console.error('載入獎勵失敗:', error));
}

function redeemReward(rewardId) {
  fetch('backend.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'redeem', reward_id: rewardId })
  })
  .then(response => {
    console.log("兌換獎勵 - HTTP 狀態碼：", response.status);
    return response.json();
  })
  .then(data => {
    console.log("兌換獎勵 - 後端回應：", data);
    if (data.status === 'success') {
      alert(data.message);
      updateUI();
      loadRewards();
    } else {
      alert(data.message);
    }
  })
  .catch(error => console.error('兌換失敗:', error));
}

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 23.6978, lng: 120.9605 }, // 台灣中心
    zoom: 8,
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({ map });

  const startInput = document.getElementById("start");
  const endInput = document.getElementById("end");

  new google.maps.places.Autocomplete(startInput);
  new google.maps.places.Autocomplete(endInput);

  map.addListener("click", (e) => {
    if (!startMarker) {
      startMarker = new google.maps.Marker({
        position: e.latLng,
        map,
        label: "A",
      });
      document.getElementById("start").value = `${e.latLng.lat()}, ${e.latLng.lng()}`;
    } else if (!endMarker) {
      endMarker = new google.maps.Marker({
        position: e.latLng,
        map,
        label: "B",
      });
      document.getElementById("end").value = `${e.latLng.lat()}, ${e.latLng.lng()}`;
    } else {
      alert("已設定起點與終點。請按下『計算地圖距離』。");
    }
  });
}

function calculateRoute() {
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  if (!start || !end) return alert("請輸入起點與終點！");

  directionsService.route({
    origin: start,
    destination: end,
    travelMode: google.maps.TravelMode.DRIVING
  }, (result, status) => {
    if (status === google.maps.DirectionsStatus.OK) {
      directionsRenderer.setDirections(result);

      const route = result.routes[0].legs[0];
      const distanceKm = route.distance.value / 1000;
      document.getElementById("map-distance").textContent = `計算距離：${distanceKm.toFixed(2)} 公里`;

      if (!selectedTransport) return alert("請先選擇交通方式");

      const footprint = calculateFootprint(selectedTransport, distanceKm);
      const pointsEarned = calculatePoints(selectedTransport, distanceKm);

      const record = {
        transport: selectedTransport,
        distance: distanceKm,
        footprint: footprint,
        points: pointsEarned,
        record_time: new Date().toISOString()
      };
      history.unshift(record);

      console.log("發送資料：", record);

      fetch('backend.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record',
          transport: selectedTransport,
          distance: distanceKm,
          footprint: footprint,
          points: pointsEarned
        })
      })
      .then(response => {
        console.log("儲存紀錄 - HTTP 狀態碼：", response.status);
        return response.json();
      })
      .then(data => {
        console.log('儲存紀錄 - 後端回應：', data);
        if (data.status === 'success') {
          console.log('資料儲存成功');
          loadHistory();
          alert(`這次${selectedTransport}移動獲得 ${pointsEarned} 點！`);
        } else {
          console.error('儲存資料失敗:', data.message);
          alert('儲存資料失敗：' + data.message);
        }
      })
      .catch(error => {
        console.error('傳送錯誤:', error);
        alert('無法連接到後端，請檢查伺服器是否運行');
      });

      updateUI();
      suggestEcoPath(selectedTransport);

      // 重置地圖標記
      if (startMarker) {
        startMarker.setMap(null);
        startMarker = null;
      }
      if (endMarker) {
        endMarker.setMap(null);
        endMarker = null;
      }
      document.getElementById("start").value = "";
      document.getElementById("end").value = "";
    } else {
      alert("無法計算路線：" + status);
    }
  });
}