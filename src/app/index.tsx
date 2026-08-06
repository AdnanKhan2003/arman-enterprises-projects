
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../components/ui/Text";

export default function Index() {
  return (
    <SafeAreaView className="flex-1 justify-center items-center bg-white dark:bg-slate-900">
      <Text className="font-bold text-blue-600 dark:text-blue-400 text-xl">
        Welcome to Nativewind!
      </Text>
    </SafeAreaView>
  );
}

