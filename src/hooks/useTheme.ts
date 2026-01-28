import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { themes } from "@/lib/themes";

export const useTheme = () => {
  const activeThemeKey = useSelector(
    (state: RootState) => state.theme.activeTheme
  );
  return {
    theme: themes[activeThemeKey],
    themeKey: activeThemeKey,
  };
};
