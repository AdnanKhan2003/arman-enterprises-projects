import { Text as RNText, TextProps, Platform } from "react-native";

export function Text(props: TextProps) {
  return (
    <RNText 
      {...props} 
      style={[
        {
          fontFamily: Platform.select({
            android: "Poppins_400Regular",
            ios: "Poppins-Regular",
            default: "Poppins_400Regular"
          })
        },
        props.style
      ]}
    />
  );
}
