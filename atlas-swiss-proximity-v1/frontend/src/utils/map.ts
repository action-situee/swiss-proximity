import type {
  ExpressionSpecification,
  LngLatBoundsLike,
  LngLatLike,
} from "maplibre-gl";

export const boundsSwitzerland: LngLatBoundsLike = [
  5.790325, 45.63959, 10.120837, 47.853792,
];

export const boundsGeneva: LngLatBoundsLike = [
  5.712891, 45.890008, 6.789551, 46.619261,
];

export const maxBoundsGeneva: LngLatBoundsLike = [
  [5.712891, 45.890008],
  [6.789551, 46.619261],
];

export const maxBoundsSwitzerland: LngLatBoundsLike = [4.5, 45.2, 11.5, 48.5];

export const centerGeneva: LngLatLike = [6.14569, 46.20222];
export const centerSwitzerland: LngLatLike = [7.95, 46.74]; // Center of Switzerland

// Create the "maplibre" expression https://maplibre.org/maplibre-gl-js-docs/style-spec/expressions/#math to calculate the weighted mean of the variables in the map

export function expressionMean(
  attributes: { id: string; weight?: number; diversity?: number }[],
  year?: number,
  distance?: number
): ExpressionSpecification | number {
  if (attributes.length == 0) return 0;

  const yearProxString =
    year !== undefined && distance !== undefined
      ? "_" + distance.toString() + "_" + year.toString()
      : "";
  // Calculate the sum of the weights
  const sumWeight = attributes.reduce(
    (partialSum, attribute) => partialSum + (attribute.weight ?? 1),
    0
  );

  // If there is only one attribute, return an expression that gets the value of the attribute
  if (attributes.length == 1)
    return [
      "to-number",
      [
        "get",
        attributes[0].diversity
          ? attributes[0].diversity + "_" + attributes[0].id
          : attributes[0].id + yearProxString,
      ],
    ] as ExpressionSpecification;

  // Otherwise, calculate the weighted mean of the attributes
  const values = attributes.map(({ id, weight, diversity }) => [
    "*",
    [
      "to-number",
      ["get", diversity ? diversity + "_" + id : id + yearProxString],
    ],
    weight ?? 1,
  ]);

  // Create an expression that calculates the sum of the weighted values
  const total = values.reduce(
    (acc, curr) => ["+", acc, curr] as (string | string[])[]
  );
  // Use the total and the sum of the weights to calculate the weighted mean
  return ["/", total, sumWeight] as ExpressionSpecification;
}

export function expressionMax(
  attributes: { id: string; weight: number; diversity: number }[]
): ExpressionSpecification | number {
  if (attributes.length == 0) return 0;

  // If there is only one attribute, return an expression that gets the value of the attribute
  if (attributes.length == 1)
    return [
      "to-number",
      ["get", attributes[0].diversity + "_" + attributes[0].id],
    ] as ExpressionSpecification;
  else if (attributes.length > 1) {
    const values: [ExpressionSpecification, ...ExpressionSpecification[]] =
      attributes.map(
        ({ id, weight, diversity }) =>
          [
            "*",
            ["to-number", ["get", diversity + "_" + id]],
            weight ?? 1,
          ] as ExpressionSpecification
      ) as [ExpressionSpecification, ...ExpressionSpecification[]];

    return ["max", ...values];
  } else return 0;
}

export function expressionSum(
  attributes: { id: string }[],
  year?: number,
  distance?: number
): ExpressionSpecification | number {
  if (attributes.length == 0) return 0;

  const yearProxString =
    year !== undefined && distance !== undefined
      ? "_" + distance.toString()
      : "";

  // If there is only one attribute, return an expression that gets the value of the attribute
  if (attributes.length == 1)
    return [
      "to-number",
      ["get", attributes[0].id + yearProxString],
    ] as ExpressionSpecification;

  const values = attributes.map(({ id }) => [
    "to-number",
    ["get", id + yearProxString],
  ]);

  // Create an expression that calculates the sum of the weighted values
  const total = values.reduce(
    (acc, curr) => ["+", acc, curr] as (string | string[])[]
  );

  return total as ExpressionSpecification;
}

// This function returns an array of colors and values to be used in the map legend. It takes the minimum and maximum values of the variable, and an array of colors.
// It returns an array of values and colors, where the values are the values of the variable that correspond to the colors in the legend.
export function stepsColors(min: number, max: number, colors: string[]) {
  const diff = max - min,
    n = colors.length,
    step = diff / (n - 1);
  const returnVal: (string | number)[] = [colors[0]];
  for (let i = 1; i < n; i++) {
    returnVal.push(i * step + min);
    returnVal.push(colors[i]);
  }
  return returnVal as [string, ...ExpressionSpecification[]];
}

// Thoses coordinates create a bounding box around Switzerland, I use them to limit the search to Switzerland
// I choose them by hand with a little margin around the country
const switzerlandGeocoordinatesLimits = [
  [45.8, 5.9],
  [47.9, 10.6],
];

// This function is used to forward geocode the search input. It takes a query string and returns a list of features.
export const geocoderAPI = {
  forwardGeocode: async (config: { query: string }) => {
    const features = [];
    try {
      const [[y1, x1], [y2, x2]] = switzerlandGeocoordinatesLimits;
      const request =
        "https://nominatim.openstreetmap.org/search?q=" +
        config.query +
        `&format=geojson&polygon_geojson=1&addressdetails=1&viewbox=${x1},${y1},${x2},${y2}&bounded=1`;
      const response = await fetch(request);
      const geojson = await response.json();
      for (const feature of geojson.features) {
        const center = [
          feature.bbox[0] + (feature.bbox[2] - feature.bbox[0]) / 2,
          feature.bbox[1] + (feature.bbox[3] - feature.bbox[1]) / 2,
        ];
        const point = {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: center,
          },
          place_name: feature.properties.display_name,
          properties: feature.properties,
          text: feature.properties.display_name,
          place_type: ["place"],
          center: center,
        };
        features.push(point);
      }
    } catch (e) {
      console.error(`Failed to forwardGeocode with error: ${e}`);
    }

    return {
      features: features,
    };
  },
};
