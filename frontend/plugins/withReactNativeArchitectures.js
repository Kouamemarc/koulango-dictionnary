/**
 * Restreint les architectures CPU natives embarquées à celles des vrais téléphones
 * (arm64-v8a, armeabi-v7a) : x86/x86_64 ne servent qu'aux émulateurs et ajoutaient
 * ~30 Mo morts à l'APK. Réappliqué à chaque `expo prebuild` (survit à --clean).
 *
 * La propriété `reactNativeArchitectures` de gradle.properties ne filtre que les
 * modules natifs autolinkés compilés localement — pas les .so précompilés livrés
 * dans les AAR (Hermes, coeur React Native). Il faut donc aussi poser `abiFilters`
 * directement sur le defaultConfig du module :app pour que ça s'applique à l'APK final.
 */
const { withGradleProperties, withAppBuildGradle } = require("@expo/config-plugins");

const ARCHITECTURES = ["arm64-v8a", "armeabi-v7a"];

function withGradlePropertiesArchitectures(config) {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;
    const existing = props.find(
      (item) => item.type === "property" && item.key === "reactNativeArchitectures"
    );
    if (existing) {
      existing.value = ARCHITECTURES.join(",");
    } else {
      props.push({ type: "property", key: "reactNativeArchitectures", value: ARCHITECTURES.join(",") });
    }
    return config;
  });
}

function withAppBuildGradleAbiFilters(config) {
  return withAppBuildGradle(config, (config) => {
    const marker = "ndk { abiFilters";
    if (config.modResults.contents.includes(marker)) return config;

    const abiFiltersBlock = `ndk { abiFilters ${ARCHITECTURES.map((a) => `"${a}"`).join(", ")} }`;
    config.modResults.contents = config.modResults.contents.replace(
      /defaultConfig\s*\{/,
      (match) => `${match}\n        ${abiFiltersBlock}`
    );
    return config;
  });
}

module.exports = function withReactNativeArchitectures(config) {
  config = withGradlePropertiesArchitectures(config);
  config = withAppBuildGradleAbiFilters(config);
  return config;
};
