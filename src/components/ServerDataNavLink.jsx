import React from "react";
import { useNavigate } from "react-router-dom";
import { useStorageMode } from "./StorageModeContext";

function ServerDataNavLink() {
  const navigate = useNavigate();
  const { setMode } = useStorageMode();

  const openQuestionBank = () => {
    setMode("server");
    navigate("/");
  };

  return (
    <button type="button" className="server-data-nav-link" onClick={openQuestionBank}>
      Question bank
    </button>
  );
}

export default ServerDataNavLink;
