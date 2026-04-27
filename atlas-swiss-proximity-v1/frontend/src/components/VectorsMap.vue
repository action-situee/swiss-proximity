<template>
  <v-container class="pa-0 fill-height" fluid>
    <div ref="container" class="map fill-height">
      <loading-circle :loading="loading" />

      <!-- Basemap Style Selector -->
      <div v-if="hasStyleSelector" class="basemap-selector">
        <v-select
          v-model="selectedStyle"
          :items="styleOptions"
          item-title="label"
          item-value="value"
          variant="outlined"
          density="compact"
          hide-details
          class="basemap-select"
          :prepend-inner-icon="mdiMap"
        />
      </div>
    </div>

    <v-snackbar
      v-model="error"
      elevation="0"
      color="transparent"
      variant="flat"
      :timeout="15000"
    >
      <v-alert
        v-model="error"
        title="Error"
        border="start"
        variant="flat"
        type="error"
        closable
      >
        {{ errorMessage }}
      </v-alert>
    </v-snackbar>
  </v-container>
</template>

<script lang="ts" setup>
import { processMapLibreStyle } from "@/utils/colorDesaturator";

import {
  ref,
  onMounted,
  withDefaults,
  defineEmits,
  watch,
  onUnmounted,
  computed,
} from "vue";
import { Map, Popup, Marker, addProtocol } from "maplibre-gl";
import type {
  ExpressionSpecification,
  LngLatBoundsLike,
  LngLatLike,
  MapLayerEventType,
} from "maplibre-gl";
import { Protocol } from "pmtiles";

import "@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css";
import "maplibre-gl/dist/maplibre-gl.css";
import MaplibreGeocoder from "@maplibre/maplibre-gl-geocoder";
import { mdiMap } from "@mdi/js";

import {
  stepsColors,
  expressionSum,
  geocoderAPI,
  expressionMax,
  boundsGeneva,
  boundsSwitzerland,
} from "@/utils/map";

import { cleanVariableString } from "@/utils/variables";
import type {
  DemandVariable,
  SupplyVariable,
  TileParams,
} from "@/utils/variables";
import LoadingCircle from "./LoadingCircle.vue";

const loading = ref(true);
const container = ref<HTMLDivElement>();

const popup = ref<Popup>(
  new Popup({
    closeButton: false,
    maxWidth: "800px",
  })
);

const protocol = new Protocol();
addProtocol("pmtiles", protocol.tile);

const error = ref(false);
const errorMessage = ref<string | null>(null);

const saturationLevel = ref(0.25); // 1.0 = normal, 0.5 = 50% saturation, 0.0 = grayscale
const originalStyles = ref<Record<string, any>>({});

// Basemap styles configuration
const styles = {
  light: "/styles/light.json",
  dark: "/styles/dark.json",
  lightbase: "/styles/lightbase.json",
};

const styleOptions = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "Lightbase", value: "lightbase" },
];

const selectedStyle = ref<keyof typeof styles>("lightbase");

const props = withDefaults(
  defineProps<{
    demandVariables: DemandVariable[];
    supplyVariables: SupplyVariable[];
    listTilesParams: TileParams[];
    colors: { color: string; label: string }[];
    selectedTilesName: string;
    hasGeocoderSearch?: boolean;
    hasStyleSelector?: boolean;
    year: number;
    maxBounds: LngLatBoundsLike;
    distance: number;
  }>(),
  { hasGeocoderSearch: true, hasStyleSelector: true }
);

const isDemand = computed(() => props.selectedTilesName.includes("demand"));

watch(
  () => isDemand.value,
  (newIsDemand) => {
    if (newIsDemand) {
      map?.fitBounds(boundsGeneva);
    } else {
      map?.fitBounds(boundsSwitzerland);
    }
  }
);

const mapColors = computed(() => props.colors.map((d) => d.color));

watch(
  () => props.selectedTilesName,
  (newSelectedTileName) => {
    console.debug("Selected tile changed to: ", newSelectedTileName);
  },
  { immediate: true }
);

const emit = defineEmits<{
  (event: "created:map", value: Map): void;
}>();

var map: Map | null = null;

async function loadAndProcessStyle(
  stylePath: string,
  saturation: number = 1.0
): Promise<any> {
  try {
    const response = await fetch(stylePath);
    const style = await response.json();

    // Cache original style if not already cached
    if (!originalStyles.value[stylePath]) {
      originalStyles.value[stylePath] = structuredClone(style);
    }

    // Return processed style if saturation is less than 1.0
    if (saturation < 1.0) {
      const saturationReduction = 1.0 - saturation;
      return processMapLibreStyle(
        originalStyles.value[stylePath],
        saturationReduction
      );
    }

    return style;
  } catch (err) {
    console.error("Failed to load style:", err);
    errorMessage.value = `Failed to load map style: ${stylePath}`;
    error.value = true;
    throw err;
  }
}

function onMove(e: MapLayerEventType["mousemove"]) {
  if (map === null) return;
  // Change the cursor style as a UI indicator.
  map.getCanvas().style.cursor = "pointer";

  // Use the first found feature.
  if (e.features === undefined || e.features === null) return;

  const feature = e.features[0],
    properties = feature.properties || {};

  if (isDemand.value) {
    const variables: DemandVariable[] = props.demandVariables;

    const proxyDistance = isDemand.value ? "_" + props.distance : "";

    const sumVariables = variables.reduce(
      (partialSum, attribute) =>
        partialSum + (properties[attribute.id + proxyDistance] || 0),
      0
    );
    // POPUP DEMANDE
    popup.value
      .setLngLat(e.lngLat)
      .setHTML(
        `<h3>${properties["Agglo"]}</h3>
      </br>
      <div>
        Part des déplacements < ${props.distance} mètres : <strong>${~~(
          100 * sumVariables
        )}%</strong> (mode.s: ${variables.map(({ name }) => name).join(", ")})

      </div>
     `
      )
      .addTo(map);
  } else {
    const variables: SupplyVariable[] = props.supplyVariables;
    // POPUP OFFRE
    popup.value
      .setLngLat(e.lngLat)
      .setHTML(
        `<h3>${properties["Agglo"]}</h3>
      </br>
      ${variables
        .map(
          ({ diversity, name, id, weight }) =>
            "<div>" +
            diversity +
            (diversity > 1 ? " lieux où " : " lieu où ") +
            cleanVariableString(name) +
            " à moins de <strong>" +
            properties[diversity + "_" + id] +
            "</strong> mètres " +
            ` (poids= ${weight})` +
            "</div>"
        )
        .join("\n")}`
      )
      .addTo(map);
  }
}

function onLeave() {
  if (map == null) return;
  map.getCanvas().style.cursor = "";
  popup.value.remove();
}

const currentExpression = computed(
  () =>
    [
      "step",
      isDemand.value
        ? expressionSum(props.demandVariables, props.year, props.distance)
        : expressionMax(props.supplyVariables),
      // Right now steps colors don't change, I will create a static value for them once the data are normalized
      ...stepsColors(0, isDemand.value ? 1 : 7000, mapColors.value),
    ] as [
      "step",
      number | ExpressionSpecification,
      string,
      ...ExpressionSpecification[],
    ]
);

watch(
  () => [
    props.demandVariables,
    props.supplyVariables,
    props.year,
    props.distance,
    props.selectedTilesName,
  ],
  () => {
    // Change the paint property using new variables and weights

    props.listTilesParams.forEach(({ name }) => {
      if (map === null) return;
      console.debug("Updating layer: ", "layer-" + secureTilesName(name));
      map.setPaintProperty(
        "layer-" + secureTilesName(name),
        "fill-color",
        currentExpression.value
      );
    });
  }
);

watch(
  () => props.selectedTilesName,
  (newSelectedTileName) => {
    props.listTilesParams.forEach(({ name }) => {
      if (map === null) return;

      // Change the visibility of the layers, only one is visible at a time
      map.setLayoutProperty(
        "layer-" + secureTilesName(name),
        "visibility",
        name === newSelectedTileName ? "visible" : "none"
      );
    });
  }
);

function secureTilesName(name: string) {
  return name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
}

function onGeocodingSearchResult(e: { result: { center: LngLatLike } }) {
  if (map === null) return;

  map.flyTo({
    center: e.result.center,
    zoom: 12,
  });
}
onMounted(async () => {
  try {
    const initialStyle = await loadAndProcessStyle(
      styles[selectedStyle.value],
      saturationLevel.value
    );

    map = new Map({
      container: container.value as HTMLDivElement,
      style: initialStyle,
      zoom: 7,
      fitBoundsOptions: {
        padding: 20,
      },
      maxBounds: props.maxBounds,
      bounds: isDemand.value ? boundsGeneva : boundsSwitzerland,
      minZoom: 6,
    }) as InstanceType<typeof Map>;

    map.on("load", function () {
      loading.value = false;
      reAddMapLayers();
    });

    if (props.hasGeocoderSearch) {
      // This control is used to search for a location
      map.addControl(
        new MaplibreGeocoder(geocoderAPI, {
          showResultsWhileTyping: true,
          showResultMarkers: false,
          marker: true,
          maplibregl: { Marker, Popup },
        }).on("result", onGeocodingSearchResult)
      );
    }
    map.on("error", (e) => {
      // Hide those annoying 404/403 errors
      if (e && e.error.message !== "Failed to fetch") console.error(e);
    });

    emit("created:map", map);
  } catch (err) {
    console.error("Failed to initialize map:", err);
    errorMessage.value = "Failed to initialize map.";
    error.value = true;
  }
});

// Watch for saturation changes and update current style
watch(saturationLevel, async (newSaturation) => {
  if (map && selectedStyle.value) {
    try {
      const processedStyle = await loadAndProcessStyle(
        styles[selectedStyle.value],
        newSaturation
      );

      map.setStyle(processedStyle);

      // Re-add layers after style change
      map.once("styledata", () => {
        reAddMapLayers();
      });
    } catch (error) {
      console.error("Failed to update saturation:", error);
    }
  }
});

// Modified watch for style changes
watch(selectedStyle, async (newStyle) => {
  if (map && newStyle) {
    try {
      const processedStyle = await loadAndProcessStyle(
        styles[newStyle],
        saturationLevel.value
      );

      map.setStyle(processedStyle);

      map.once("styledata", () => {
        reAddMapLayers();
      });
    } catch (error) {
      console.error("Failed to change style:", error);
    }
  }
});

// Extract layer re-adding logic into a reusable function
function reAddMapLayers() {
  if (map == null) return;

  props.listTilesParams.forEach((tile) => {
    if (map == null) return;

    map.addSource(secureTilesName(tile.name), {
      type: "vector",
      url: tile.url,
    });

    const layers = map.getStyle().layers;
    let firstSymbolId: string | undefined;

    // Find the first symbol layer
    for (let i = 0; i < layers.length; i++) {
      if (layers[i].type === "symbol") {
        firstSymbolId = layers[i].id;
        break;
      }
    }

    // Add our data layer before symbols
    map.addLayer(
      {
        id: "layer-" + secureTilesName(tile.name),
        type: "fill",
        source: secureTilesName(tile.name),
        "source-layer": secureTilesName(tile.name),
        layout: {
          visibility:
            props.selectedTilesName === tile.name ? "visible" : "none",
        },
        paint: {
          "fill-color": currentExpression.value,
          "fill-opacity": 0.6,
        },
      },
      firstSymbolId
    );

    // Move all water layers to render above our data layers but below symbols
    const waterLayers = layers.filter(
      (layer) => layer.id.includes("water") && layer.type !== "symbol"
    );

    waterLayers.forEach((waterLayer) => {
      if (map === null) return;
      // Remove and re-add water layer to move it above our data layer
      map.removeLayer(waterLayer.id);
      map.addLayer(waterLayer, firstSymbolId);
    });

    map
      .on("mousemove", "layer-" + secureTilesName(tile.name), onMove)
      .on("mouseleave", "layer-" + secureTilesName(tile.name), onLeave);
  });
}

onUnmounted(() => {
  if (map === null) return;
  props.listTilesParams.map((tile) => {
    map
      ?.off("mousemove", "layer-" + secureTilesName(tile.name), onMove)
      .off("mouseleave", "layer-" + secureTilesName(tile.name), onLeave);
  });
});
</script>

<style scoped>
.map {
  width: 100%;
  position: relative;
}

.basemap-selector {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 1000;
  width: 200px;
}

.basemap-select {
  background-color: rgba(255, 255, 255, 1);
}
</style>
