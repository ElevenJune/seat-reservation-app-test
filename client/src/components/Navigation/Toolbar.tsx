import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { RoundedButton } from "../Widgets/RoundedButton";
import "./Toolbar.css";

export const Toolbar = () => {
  const [isHome, setIsHome] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
    useEffect(() => {
      setIsHome(location.pathname==="/")
    }, [location]);
  return (
    <div className="nav-back">
      <header className="page-container" style={{paddingBottom:"0px"}}>
        <div className="navbar">
          <RoundedButton hidden={isHome} id="back" onClick={() => {navigate(-1);}}>
            {window.history.length>0 ? "Back" : "No"}
          </RoundedButton>
          <RoundedButton disabled={isHome} onClick={() => { navigate("/");}}>Home</RoundedButton>
        </div>
      </header>
    </div>
  );
};
