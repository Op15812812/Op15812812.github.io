const transportOptions = ["步行", "腳踏車", "機車", "汽車", "大眾運輸"];
let selectedTransport = "";
let history = [];
let points = 0;
let watchId = null;
let positions = [];

window.onload = () => {
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
};

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

function handleSubmit() {
  const dist = parseFloat(document.getElementById("distance").value);
  if (!selectedTransport || isNaN(dist)) return alert("請選擇交通方式並輸入有效的距離。");

  const footprint = calculateFootprint(selectedTransport, dist);
  history.unshift({ transport: selectedTransport, distance: dist, footprint });
  points += 10;
  updateUI();
  suggestEcoPath(selectedTransport);
  document.getElementById("distance").value = "";

  saveRecord(selectedTransport, dist, footprint);
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
    history.unshift({ transport: selectedTransport, distance: totalDistance, footprint });
    points += 10;
    updateUI();
    suggestEcoPath(selectedTransport);

    saveRecord(selectedTransport, totalDistance, footprint);
  }
}

function haversineDistance(p1, p2) {
  const R = 6371;
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(p2.lat - p1.lat);
  const dLon = toRad(p2.lon - p1.lon);
  const lat1 = toRad(p1.lat);
  const lat2 = toRad(p2.lat);

  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function updateUI() {
  document.getElementById("points").textContent = points;
  const list = document.getElementById("history-list");
  list.innerHTML = "";
  history.forEach(record => {
    const li = document.createElement("li");
    li.className = "list-group-item";
    li.textContent = `${record.transport} - ${record.distance} 公里 - 碳排放 ${record.footprint.toFixed(2)} kg CO₂`;
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

function saveRecord(transport, distance, footprint) {
  fetch("save.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      transport: transport,
      distance: distance,
      footprint: footprint.toFixed(2)
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status !== "success") {
      console.error("儲存失敗", data.message);
    }
  })
  .catch(err => console.error("伺服器錯誤", err));
}
let map, directionsService, directionsRenderer;
let startMarker = null, endMarker = null;

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

      // 自動選擇目前選取交通工具來紀錄
      if (!selectedTransport) return alert("請先選擇交通方式");

      const footprint = calculateFootprint(selectedTransport, distanceKm);
      history.unshift({ transport: selectedTransport, distance: distanceKm, footprint });
      points += 10;
      updateUI();
      suggestEcoPath(selectedTransport);
      saveRecord(selectedTransport, distanceKm, footprint);
    } else {
      alert("無法計算路線：" + status);
    }
  });
}
