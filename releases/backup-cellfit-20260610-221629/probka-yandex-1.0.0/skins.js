(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  const SKINS = [
    { id: "classic_red", name: "Красная классика", price: 0, color: "#ff5c68", accent: "#fff2a8", trim: "#2d1118", pattern: "rally", badge: "01" },
    { id: "taxi_yellow", name: "Шашечный рывок", price: 180, color: "#ffd166", accent: "#2d2100", trim: "#fff2a8", pattern: "checker", badge: "T" },
    { id: "mint_courier", name: "Курьерский болид", price: 320, color: "#55d6a8", accent: "#ffcc4d", trim: "#113d34", pattern: "parcel", badge: "GO" },
    { id: "pizza_mobile", name: "Пицца-мобиль", price: 520, color: "#f05d3b", accent: "#ffe066", trim: "#3d1711", pattern: "pizza", badge: "PZ" },
    { id: "night_blue", name: "Ночной неон", price: 780, color: "#4aa3ff", accent: "#8ff7ff", trim: "#101a35", pattern: "neon", badge: "N" },
    { id: "yard_police", name: "Дворовая полиция", price: 1100, color: "#e8edf2", accent: "#4aa3ff", trim: "#10223d", pattern: "siren", badge: "02" },
    { id: "yard_ambulance", name: "Скорая во дворе", price: 1480, color: "#f7fbff", accent: "#f0707c", trim: "#1c2a36", pattern: "medical", badge: "03" },
    { id: "fire_lane", name: "Пожарный проезд", price: 1900, color: "#e94343", accent: "#ffd166", trim: "#3d1010", pattern: "hazard", badge: "01" },
    { id: "retro_volga", name: "Ретро-Волга", price: 2380, color: "#7fd1c7", accent: "#f5e4bc", trim: "#123d3a", pattern: "retro", badge: "21" },
    { id: "business_taxi", name: "Такси бизнес", price: 2920, color: "#181f2c", accent: "#ffd166", trim: "#0a0f18", pattern: "business", badge: "B" },
    { id: "sticker_drifter", name: "Дрифтер с наклейками", price: 3520, color: "#b889ff", accent: "#ff7ad9", trim: "#24143d", pattern: "stickers", badge: "DR" },
    { id: "violet_share", name: "Каршеринг 77", price: 4200, color: "#7c8cff", accent: "#66d6a6", trim: "#171d44", pattern: "comet", badge: "77" },
    { id: "ice_chrome", name: "Ледяной хром", price: 4960, color: "#bfe8ff", accent: "#ffffff", trim: "#2d5f75", pattern: "chrome", badge: "ICE" },
    { id: "graffiti_coupe", name: "Граффити-купе", price: 5800, color: "#55d6a8", accent: "#ff7ad9", trim: "#113d34", pattern: "graffiti", badge: "ART" },
    { id: "cyber_yard", name: "Кибер-двор", price: 6720, color: "#121a2d", accent: "#66f2ff", trim: "#5d6bff", pattern: "cyber", badge: "AI" },
    { id: "gold_yard", name: "Золотая легенда", price: 7720, color: "#ff9f43", accent: "#fff2a8", trim: "#4a2600", pattern: "crown", badge: "VIP" },
    { id: "black_vip", name: "Черный VIP", price: 8800, color: "#0d111a", accent: "#d8b56d", trim: "#020409", pattern: "vip", badge: "VIP" },
    { id: "tow_final", name: "Финальный эвакуатор", price: 10000, color: "#ffb84d", accent: "#1c2433", trim: "#5f3300", pattern: "tow", badge: "TOW" }
  ].map((skin, index) => ({
    ...skin,
    sprite: { src: `./assets/skins/v3/${skin.id}.png`, width: 384, height: 768, index }
  }));

  root.PROBKA_SKINS = SKINS;
})();
