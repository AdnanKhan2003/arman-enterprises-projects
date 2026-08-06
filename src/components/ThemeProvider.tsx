import { useColorScheme, vars } from "nativewind";
import { View } from "react-native";

const themes = {
  light: vars({
    "--color-background": "255 255 255",
    "--color-foreground": "17 24 39",
    "--color-card": "243 244 246",
    "--color-primary": "37 99 235",
  }),
  dark: vars({
    // Dark Mode (RGB values)
    "--color-background": "17 24 39", // gray-900
    "--color-foreground": "255 255 255", // white
    "--color-card": "31 41 55", // gray-800
    "--color-primary": "59 130 246", // blue-500
  }),
};

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { colorScheme } = useColorScheme();
  const theme = colorScheme === 'dark' ? themes.dark : themes.light;
  return (
    <View style={[theme, { flex: 1 }]}>
      {children}
    </View>
  );
};

export default ThemeProvider;
