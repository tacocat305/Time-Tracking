import type { ColorMode, ThemeName } from "@/theme/themes";

export type ScreenId =
  "today" | "week" | "month" | "billing" | "clients" | "expenses" | "settings";

export interface AppAppearance {
  colorMode: ColorMode;
  themeName: ThemeName;
}
