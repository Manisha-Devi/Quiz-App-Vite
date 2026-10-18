import { useContext } from "react";
import StorageModeContext from "./storageModeStore";

function useStorageMode() {
  const context = useContext(StorageModeContext);
  if (!context) {
    throw new Error("useStorageMode must be used inside StorageModeProvider.");
  }
  return context;
}

export default useStorageMode;
