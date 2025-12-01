// index.tsx
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import axios from "axios";
import { BarcodeScanningResult, CameraType, CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

type RootStackParamList = {
  Login: undefined;
  Scanner: { username: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const API = axios.create({
  baseURL: "https://lebontechnicien.net/",
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
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        autoCapitalize="none"
      />
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
}

function ScannerScreen({ route }: any) {
  const { username } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [type, setType] = useState<CameraType>("back");
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      // Request location permissions upfront
      const locationStatus = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(locationStatus.status === "granted");
    })();
  }, []);

  const handleBarCodeScanned = async (scan: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);

    // Verify location permission
    if (!locationPermission) {
      Alert.alert(
        "Location Permission Required",
        "Please enable location services to save scan data.",
        [
          { text: "Cancel", style: "cancel", onPress: () => setScanned(false) },
          { 
            text: "Enable", 
            onPress: async () => {
              const { status } = await Location.requestForegroundPermissionsAsync();
              setLocationPermission(status === "granted");
              if (status === "granted") {
                await processScanWithLocation(scan);
              } else {
                Alert.alert("Permission Denied", "Cannot save scan without location.");
                setScanned(false);
              }
            }
          }
        ]
      );
      return;
    }

    await processScanWithLocation(scan);
  };

  const processScanWithLocation = async (scan: BarcodeScanningResult) => {
    try {
      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const payload = {
        username: username,
        qr_data: scan.data,
        location: {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          accuracy: location.coords.accuracy,
        },
        timestamp: new Date().toISOString(),
      };

      await API.post("/api/scan", payload);
      Alert.alert("Success", "Scan saved successfully!");
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.error || "Failed to save scan");
      console.error("Scan error:", error);
    } finally {
      setTimeout(() => setScanned(false), 2000);
    }
  };

  const toggleCameraType = () => {
    setType(current => 
      current === "back" ? "front" : "back"
    );
  };

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No access to camera</Text>
        <Button 
          title="Grant Permission" 
          onPress={requestPermission}
        />
      </View>
    );
  }

  return (
    <View style={styles.scannerContainer}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={type}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "pdf417", "ean13", "ean8", "upc_a", "upc_e", "code39", "code128"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.cameraOverlay}>
          {/* Scan frame overlay */}
          <View style={styles.scanFrame} />
          <Text style={styles.scanText}>Align QR code within frame</Text>
        </View>
      </CameraView>
      
      <View style={styles.footer}>
        <Text style={styles.usernameText}>Logged in as: {username}</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.flipButton} onPress={toggleCameraType}>
            <Text style={styles.flipButtonText}>Flip Camera</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.scanButton, scanned && styles.scanButtonDisabled]} 
            onPress={() => setScanned(false)}
            disabled={!scanned}
          >
            <Text style={styles.scanButtonText}>
              {scanned ? "Scanning..." : "Tap to Scan"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <Stack.Navigator 
      initialRouteName="Login"
      screenOptions={{
        headerStyle: { backgroundColor: '#4A90E2' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
        options={{ title: 'Login' }}
      />
      <Stack.Screen 
        name="Scanner" 
        component={ScannerScreen} 
        options={{ 
          title: 'QR Code Scanner',
          headerBackVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    justifyContent: "center", 
    backgroundColor: "#f5f5f5" 
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  scannerContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: 'transparent',
    borderRadius: 10,
  },
  scanText: {
    fontSize: 16,
    color: 'white',
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  title: { 
    fontSize: 28, 
    marginBottom: 20, 
    textAlign: "center",
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 15,
    alignItems: "center",
  },
  usernameText: {
    color: "white",
    fontSize: 16,
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  flipButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  flipButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  scanButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 5,
  },
  scanButtonDisabled: {
    backgroundColor: '#9E9E9E',
  },
  scanButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
});