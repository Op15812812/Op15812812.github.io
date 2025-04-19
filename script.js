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
    totalDistance = totalDistance.toFixed(3);

    const footprint = calculateFootprint(selectedTransport, totalDistance);
    history.unshift({ transport: selectedTransport, distance: totalDistance, footprint });
    points += 10;

    updateUI();
    suggestEcoPath(selectedTransport);
  }
}

function haversineDistance(p1, p2) {
  const R = 6371; // km
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