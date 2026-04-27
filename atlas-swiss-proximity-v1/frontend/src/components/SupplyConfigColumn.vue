<template>
  <v-card
    class="px-2 px-xl-3 px-xxl-6 py-2"
    flat
  >
    <v-card-title class="my-2">
      Offre de proximité
      <info-tooltip>Basée sur les données OSM (juin 2023)</info-tooltip>
      <v-btn
        :icon="show ? mdiChevronUp : mdiChevronDown"
        flat
        density="compact"
        @click="show = !show"
      />
    </v-card-title>
    <template v-if="show">
      <v-card-text>
        <div
          v-for="variable in variables"
          :key="variable.id"
          class="pb-2"
        >
          <v-checkbox
            v-model="variable.selected"
            density="compact"
            hide-details
            @change="onVariableChange(variable)"
          >
            <template #label>
              <div class="pl-1 font-weight-medium">
                {{ variable.name }}
              </div>
              <info-tooltip v-if="variable.infos.length > 0">
                {{ variable.infos.join(", ") }}
              </info-tooltip>
            </template>
          </v-checkbox>

          <v-row
            v-if="variable.selected"
            class="pl-7"
            align="center"
            no-gutters
          >
            <v-col cols="6">
              <v-label>diversité</v-label>
            </v-col>
            <v-col cols="6">
              <v-slider
                v-model="variable.diversity"
                hide-details
                density="compact"
                track-size="1"
                thumb-size="10"
                :color="variable.selected ? 'black' : 'grey'"
                min="1"
                max="5"
                step="1"
                thumb-label
              />
            </v-col>

            <v-col cols="6">
              <v-label>poids</v-label>
            </v-col>
            <v-col cols="6">
              <v-slider
                v-model="variable.weight"
                hide-details
                density="compact"
                track-size="1"
                thumb-size="10"
                :color="variable.selected ? 'black' : 'grey'"
                min="0"
                max="1"
                step="0.25"
                thumb-label
              />
            </v-col>
          </v-row>
        </div>
      </v-card-text>
    </template>
  </v-card>
</template>

<script lang="ts" setup>
import { watch, ref } from "vue";
import InfoTooltip from "@/components/InfoTooltip.vue";
import type { SupplyVariable } from "@/utils/variables";
import { mdiChevronUp, mdiChevronDown } from "@mdi/js";

const props = defineProps<{
  variables: SupplyVariable[];
}>();

const emits = defineEmits<{
  (event: "update:variables", variables: SupplyVariable[]): void;
}>();

const show = ref(true);

function onVariableChange(variable: SupplyVariable) {
  if (variable.id === "All" && variable.selected) {
    // Select all variables
    props.variables
      .filter((v) => v.id !== "All")
      .forEach((v) => (v.selected = false));
  } else if (variable.id !== "All" && variable.selected) {
    // Unselect 'All' if any other variable is unselected
    const allVar = props.variables.find((v) => v.id === "All");
    if (allVar) allVar.selected = false;

    // If all non-All variables are selected, select 'All'
    const allNonAllSelected = props.variables
      .filter((v) => v.id !== "All")
      .every((v) => v.selected);

    if (allVar && allNonAllSelected) allVar.selected = true;
  }
}

watch(
  () => props.variables.map((v) => v.selected),
  () => {
    emits("update:variables", props.variables);
  },
  { deep: true }
);
</script>
