import React from "react";
import { NavLink } from "react-router-dom";

function ServerDataNavLink() {
  return (
    <NavLink
      to="/server-data"
      className={({ isActive }) =>
        `server-data-nav-link${isActive ? " active" : ""}`
      }
    >
      Server Data
    </NavLink>
  );
}

export default ServerDataNavLink;
