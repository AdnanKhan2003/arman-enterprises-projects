import { useColorScheme, VariableContextProvider } from "nativewind";
import { View } from "react-native";

const themes = {
  light: {
    "--color-background": "255 255 255",
    "--color-foreground": "17 24 39",
    "--color-card": "243 244 246",
    "--color-primary": "37 99 235",
  } as const,
  dark: {
    "--color-background": "17 24 39",
    "--color-foreground": "255 255 255",
    "--color-card": "31 41 55",
    "--color-primary": "59 130 246",
  } as const,
};

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { colorScheme } = useColorScheme();
  const theme = colorScheme === "dark" ? themes.dark : themes.light;

  return (
    <VariableContextProvider value={theme}>
      <View className="flex-1 bg-white dark:bg-slate-900">
        {children}
      </View>
    </VariableContextProvider>
  );
};

export default ThemeProvider;

