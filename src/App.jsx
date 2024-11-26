import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SidebarNav from './components/Sidebar/SidebarNav.jsx';
import Dashboard from './components/Dashboard/Dashboard.jsx';
import Profile from './components/Profile/Profile.jsx';
import { ConfigProvider, theme as antdTheme } from 'antd';
import Typography from '@mui/material/Typography';
import FileExplorer from './components/FileExplorer/FileExplorer.jsx';


function App() {
  const savedTheme = localStorage.getItem('theme');
  const [isDarkMode, setIsDarkMode] = useState(savedTheme === 'dark' ? true : false);

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  
  const dynamicTheme = {
    algorithm: isDarkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    components: {
      Layout: {
        headerBg: isDarkMode ? "rgb(4,35,64)" : "rgb(249,247,255)",
        triggerBg: "rgb(0,0,0)",
        siderBg: isDarkMode ? "#1A1A1D" : "rgb(249,247,255)",
      },
      Menu: {
        itemBg: isDarkMode ? "#1A1A1D" : "rgb(249,247,255)",
        itemSelectedBg: isDarkMode
          ? "rgb(176,95,247)"
          : "rgba(123,95,247,0.69)",
        itemSelectedColor: isDarkMode ? "#fbf7ff" : "#1e0e2d",
        subMenuItemBg: isDarkMode
          ? "rgba(112,74,207,0.12)"
          : "#F0E9FB",
      },
    },
    token: {
      colorPrimary: isDarkMode ? "#fbf7ff" : "#8b70cf",
      colorInfo: isDarkMode ? "#fbf7ff" : "#1e0e2d",
    },
  };

  return (
    <ConfigProvider theme={dynamicTheme}>
      <Router>
        <div
          style={{
            backgroundColor: isDarkMode ? "rgb(18,18,18)" : "#EBEBEB",
            color: isDarkMode ? "rgb(255,255,255)" : "rgb(0,0,0)",
            minHeight: "100vh",
            transition: "background-color 0.3s ease, color 0.3s ease",
            display: "flex",
          }}
        >
          
          <SidebarNav isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />

          
          <div style={{ flex: 1, padding: '16px', position: 'relative' }}>

            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/files" element={<FileExplorer isDarkMode={isDarkMode} />} /> 
            </Routes>

            
            <footer
              style={{
                color: isDarkMode ? "rgb(200,200,200)" : "rgb(0,0,0)",
                position: 'absolute',
                bottom: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                textAlign: 'center',
              }}
            >
              <Typography variant='overline'>NEXTGEN PEMSS ©{new Date().getFullYear()} Created by LOI-GASM</Typography>
            </footer>

          </div>
          
        </div>
      </Router>
    </ConfigProvider>
  );
}

export default App;
