// index.tsx
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import axios from "axios";
import { BarCodeScannerResult, Camera } from "expo-camera";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";

type RootStackParamList = {
  Login: undefined;
  Scanner: { username: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const API = axios.create({
  baseURL: "https://lebontechnicien.net/", // replace with your Flask backend
});

function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Username and password required");
      return;
    }

    try {
      const res = await API.post("/login", { username, password });
      Alert.alert("Success", "Login successful");
      navigation.navigate("Scanner", { username });
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.error || "Login failed");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
}

function ScannerScreen({ route }: any) {
  const { username } = route.params;
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraRef, setCameraRef] = useState<Camera | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleBarCodeScanned = async (scan: BarCodeScannerResult) => {
    if (scanned) return;
    setScanned(true);

    // Get location
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Location permission required");
      setScanned(false);
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});

    const payload = {
      username : username,
      qr_data: scan.data,
      location: {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      },
      timestamp: new Date().toISOString(),
    };

    try {
      await API.post("/api/scan", payload);
      Alert.alert("Success", "Scan saved!");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.error || "Failed to save scan");
    }

    setTimeout(() => setScanned(false), 2000); // allow scanning again after 2s
  };

  if (hasPermission === null) return <Text>Requesting camera permission...</Text>;
  if (hasPermission === false) return <Text>No access to camera</Text>;

  return (
    <View style={{ flex: 1 }}>
      <Camera
        style={{ flex: 1 }}
        type={CameraType.back}
        onBarCodeScanned={handleBarCodeScanned}
        ref={(ref) => setCameraRef(ref)}
      />
      <View style={styles.footer}>
        <Text style={{ color: "white", fontSize: 18 }}>Logged in as: {username}</Text>
      </View>
    </View>
  );
}

export default function App() {
  return (
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Scanner" component={ScannerScreen} />
      </Stack.Navigator>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center", backgroundColor: "#f5f5f5" },
  title: { fontSize: 28, marginBottom: 20, textAlign: "center" },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    width: "100%",
    alignItems: "center",
  },
});
