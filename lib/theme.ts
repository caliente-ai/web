"use client";

import { createTheme } from "@mui/material/styles";

// MUI theme matching the Stitch v2 "Agentic Precision" design tokens.
// Tailwind handles the bulk of styling; this theme is used for MUI primitives
// (Buttons, Dialogs, Menus, TextField, Tooltip, etc.) so they feel native.
export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#2563eb", contrastText: "#ffffff" },
    secondary: { main: "#0f172a", contrastText: "#ffffff" },
    error: { main: "#dc2626" },
    success: { main: "#16a34a" },
    warning: { main: "#d97706" },
    background: { default: "#f7f9fb", paper: "#ffffff" },
    text: { primary: "#191c1e", secondary: "#434655" },
    divider: "#e5e7eb",
  },
  typography: {
    fontFamily: '"Inter", system-ui, sans-serif',
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600, paddingInline: 16 },
        sizeSmall: { paddingInline: 12 },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small", variant: "outlined" },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 8, fontSize: 14 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { fontSize: 11, backgroundColor: "#0f172a" },
      },
    },
    MuiPaper: {
      styleOverrides: { rounded: { borderRadius: 12 } },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 16 } },
    },
  },
});
