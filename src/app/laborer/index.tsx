import { View, Text, StyleSheet } from "react-native";
import { authApi } from "../../api/auth";

export default function LaborerDashboard() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Laborer Dashboard</Text>
      <Text style={styles.subtext} onPress={() => authApi.logout()}>Sign Out</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#F8FAFC",
    fontSize: 24,
    fontWeight: "bold",
  },
  subtext: {
    color: "#3B82F6",
    fontSize: 16,
    marginTop: 20,
    padding: 10,
  }
});
