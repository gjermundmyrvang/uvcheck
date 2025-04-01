import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";

import * as Location from "expo-location";

export default function App() {
  const [data, setData] = useState(null);
  const [dataErrorMsg, setDataErrorMsg] = useState(null);
  const [location, setLocation] = useState(null);
  const [placeName, setPlaceName] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [peakUV, setPeakUV] = useState(null);

  useEffect(() => {
    async function getCurrentLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setLocation(location.coords);

      let reverseGeo = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeo.length > 0) {
        setPlaceName(reverseGeo[0].city || reverseGeo[0].region || "Unknown");
      }
    }

    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (errorMsg) {
      setDataErrorMsg("Failed to get wetherdata");
      return;
    }
    async function fetchWeatherData() {
      const coord = {
        lat: location.latitude,
        lon: location.longitude,
      };
      const weatherdata = await fetchLatest(coord);
      if (weatherdata) {
        setData(weatherdata);
      }
    }

    fetchWeatherData();
  }, [location]);

  const fetchLatest = async (coord) => {
    const result = await fetchData(coord);
    const peak = findPeak(result);
    const latest = result.properties.timeseries[0].data.instant.details;

    const details = {
      air_pressure_at_sea_level: latest.air_pressure_at_sea_level ?? null,
      air_temperature: latest.air_temperature ?? null,
      cloud_area_fraction: latest.cloud_area_fraction ?? null,
      cloud_area_fraction_high: latest.cloud_area_fraction_high ?? null,
      cloud_area_fraction_low: latest.cloud_area_fraction_low ?? null,
      cloud_area_fraction_medium: latest.cloud_area_fraction_medium ?? null,
      dew_point_temperature: latest.dew_point_temperature ?? null,
      fog_area_fraction: latest.fog_area_fraction ?? null,
      relative_humidity: latest.relative_humidity ?? null,
      ultraviolet_index_clear_sky: latest.ultraviolet_index_clear_sky ?? null,
      wind_from_direction: latest.wind_from_direction ?? null,
      wind_speed: latest.wind_speed ?? null,
    };
    console.log(details);
    console.log("Peak:", peak);

    setData(details);
    setPeakUV(peak);
  };

  const findPeak = (data) => {
    const relevant = data.properties.timeseries;
    console.log("Relevant: ", relevant);
    const uvData = relevant.map(
      (d) => +d.data.instant.details?.ultraviolet_index_clear_sky || 0
    );
    const peak = Math.max(...uvData);
    return peak;
  };

  const refresh = async () => {
    console.log("Refresh");
    const coord = {
      lat: location.latitude,
      lon: location.longitude,
    };
    fetchLatest(coord);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>UV CHECK</Text>

      {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
      {dataErrorMsg && <Text style={styles.error}>{dataErrorMsg}</Text>}

      <View style={styles.card}>
        <Text style={styles.infoText}>Showing UV for: {placeName}</Text>
      </View>

      {!location ? (
        <ActivityIndicator size="large" color="#fff" />
      ) : (
        <View style={styles.card}>
          <Text style={styles.infoText}>
            📍 Latitude: {location.latitude.toFixed(2)}
          </Text>
          <Text style={styles.infoText}>
            📍 Longitude: {location.longitude.toFixed(2)}
          </Text>
        </View>
      )}

      {peakUV && (
        <View style={styles.uvBox}>
          <Text style={styles.uvText}>Peak UV: {peakUV}</Text>
        </View>
      )}
      {data && (
        <View
          style={[
            styles.uvBox,
            { backgroundColor: getUVColor(data.ultraviolet_index_clear_sky) },
          ]}
        >
          <Text style={styles.uvText}>
            Latest UV: {data.ultraviolet_index_clear_sky}
          </Text>
        </View>
      )}
      <TouchableOpacity
        style={[styles.uvBox, { backgroundColor: "orange" }]}
        onPress={refresh}
      >
        <Text style={styles.uvText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
}

const getUVColor = (uv) => {
  if (uv === null || uv === undefined) return "#ccc";
  if (uv <= 2) return "#4CAF50";
  if (uv <= 5) return "#FFC107";
  if (uv <= 7) return "#FF9800";
  return "#F44336";
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    flexDirection: "column",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 20,
    textTransform: "uppercase",
  },
  error: {
    color: "#ff4d4d",
    fontSize: 16,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#1E1E1E",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  infoText: {
    color: "#bbb",
    fontSize: 18,
    marginBottom: 5,
  },
  uvBox: {
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    width: "90%",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
  },
  uvText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
});

const fetchData = async (coord) => {
  const lat = coord.lat;
  const lon = coord.lon;
  console.log("Lat:", lat);
  console.log("Lon:", lon);

  try {
    const response = await fetch(
      `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${lat}&lon=${lon}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const result = await response.json();
    console.log(result);
    return result;
  } catch (error) {
    console.error("Error fetching data:", error);
  }
};
