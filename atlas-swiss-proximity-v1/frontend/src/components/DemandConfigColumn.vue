<template>
  <v-card
    class="px-2 px-xl-3 px-xxl-6 py-2 demand-config"
    flat
  >
    <v-card-title class="my-2">
      Demande de proximité
      <info-tooltip>
        Basée sur le MNTP et les projections de l’ARE, DETEC
      </info-tooltip>
      <v-btn
        :icon="show ? mdiChevronUp : mdiChevronDown"
        flat
        density="compact"
        @click="show = !show"
      />
    </v-card-title>

    <template v-if="show">
      <v-card-title>
        Seuil de proximité
        <info-tooltip>
          Seuil de distance en dessous de laquelle un déplacement est “de
          proximité”. 1300m correspond environ à 15’ à pied, 3800m à 15’ à vélo
          et 7000m 30’ à vélo.
        </info-tooltip>
      </v-card-title>
      <v-card-text>
        <v-select
          variant="outlined"
          class="pt-1"
          :model-value="distanceSelected"
          :items="listDistances"
          hint="Cette distance (en m) correspond à votre seuil de proximité"
          persistent-hint
          @update:model-value="emits('update:distanceSelected', $event)"
        />
      </v-card-text>
    </template>
  </v-card>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from "vue";
import type { DemandVariable } from "@/utils/variables";
import { mdiChevronUp, mdiChevronDown } from "@mdi/js";

import InfoTooltip from "@/components/InfoTooltip.vue";
import { listDistances } from "@/utils/variables";
const props = defineProps<{
  variables: DemandVariable[];
  yearSelected: number;
  distanceSelected: number;
}>();

const emits = defineEmits<{
  (event: "update:variables", variables: DemandVariable[]): void;
  (event: "update:yearSelected", yearSelected: number): void;
  (event: "update:distanceSelected", distanceSelected: number): void;
}>();

const show = ref(true);

const isAllSelected = computed(
  () =>
    props.variables.find((variable) => variable.id === "All_modes")?.selected
);

watch(isAllSelected, (isAllSelected) => {
  if (isAllSelected)
    props.variables.forEach((v) => (v.selected = v.id === "All_modes"));
});

watch(
  () => props.yearSelected,
  (yearSelected) => emits("update:yearSelected", Number(yearSelected))
);

watch(
  () => props.distanceSelected,
  (distanceSelected) =>
    emits("update:distanceSelected", Number(distanceSelected))
);

watch(
  () => props.variables,
  (variables) => {
    emits("update:variables", variables);
  }
);
</script>
