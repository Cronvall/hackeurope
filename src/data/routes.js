export const ROUTES = {
  "sthlm-gbg": { label: "Stockholm → Gothenburg", distance: 472, duration: 285, stops: [{ stationId: "cs-linkoping", arrivalSoc: 42, departSoc: 80, chargeMin: 38 }, { stationId: "cs-jonkoping", arrivalSoc: 31, departSoc: 85, chargeMin: 47 }] },
  "sthlm-malmo": { label: "Stockholm → Malmö", distance: 614, duration: 370, stops: [{ stationId: "cs-linkoping", arrivalSoc: 42, departSoc: 85, chargeMin: 42 }, { stationId: "cs-jonkoping", arrivalSoc: 29, departSoc: 90, chargeMin: 55 }, { stationId: "cs-malmo", arrivalSoc: 38, departSoc: 80, chargeMin: 35 }] },
  "sthlm-gavle": { label: "Stockholm → Gävle", distance: 171, duration: 110, stops: [{ stationId: "cs-gavle", arrivalSoc: 55, departSoc: 90, chargeMin: 28 }] },
  "gbg-malmo": { label: "Gothenburg → Malmö", distance: 279, duration: 175, stops: [{ stationId: "cs-malmo", arrivalSoc: 48, departSoc: 80, chargeMin: 25 }] },
};
