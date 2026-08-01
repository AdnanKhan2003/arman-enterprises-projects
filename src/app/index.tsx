import { StyleSheet, Text, View } from "react-native";
import "../../global.css";

export default function Index() {
  return (
    <View className="flex-1 justify-center items-center bg-white">
      <Text className="font-bold text-blue-500 text-xl">
        Welcome to Nativewind!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
