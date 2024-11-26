import { useState } from 'react';
import PropTypes from 'prop-types'; // Import PropTypes
import { DesktopOutlined, FolderOutlined, DashboardOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { ChevronsLeft, ChevronsRight} from 'lucide-react';
import { Layout, Menu, Button } from 'antd';
import { Link } from 'react-router-dom';
import Namecard from './../namecard.png';
import { MoonStar, SunMoon } from 'lucide-react';
import Typography from '@mui/material/Typography';

const { Sider } = Layout;

function getItem(label, key, icon, children) {
  return {
    key,
    icon,
    children,
    label,
  };
}

const items = [
  getItem(<Link to="/dashboard">Dashboard</Link>, '1', <DashboardOutlined />),
  getItem(<Link to="/">Event Monitor</Link>, '2', <DesktopOutlined />),
  getItem('Users', 'sub1', <UserOutlined />, [
    getItem('Ihh', '3'),
    getItem('Bilat', '4'),
    getItem('Ukinam', '5'),
  ]),
  getItem('Team', 'sub2', <TeamOutlined />, [
    getItem('Team 1', '6'),
    getItem('Team 2', '8')
  ]),
  getItem(<Link to="/files">Files</Link>, '9', <FolderOutlined />),
];

const SidebarNav = ({ isDarkMode, setIsDarkMode }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout
      style={{
        minHeight: '100vh',
        maxWidth: 'fit-content',
        background: 'transparent',
      }}
    >
      <Sider
        collapsible
        trigger={null}
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        style={{
          borderRight: '1px solid rgba(232,232,232,0.20)',
          borderRadius: '0 13px 13px 0',
        }}
        width={250}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '13%', marginBottom: '13%' }}>
          <img src={Namecard} alt="genshin" style={{ width: '80%', borderRadius: '3%' }} />
        </div>
        <Typography variant='h6'>
        <Menu defaultSelectedKeys={['1']} mode="inline" items={items} style={{ border: 'none' }} />
        </Typography>

        <div
          style={{
            position: 'absolute',
            bottom: '0',
            right: '0',
            zIndex: '1',
            maxWidth: 'fit-content',
            background: 'transparent',
          }}
        >
          {collapsed ? (
            <ChevronsRight
              size={20}
              strokeWidth={1}
              color="#46acf1"
              onClick={() => setCollapsed(!collapsed)}
              style={{ cursor: 'pointer' }}
            />
          ) : (
            <ChevronsLeft
              size={20}
              strokeWidth={1}
              color="#46acf1"
              onClick={() => setCollapsed(!collapsed)}
              style={{ cursor: 'pointer' }}
            />
          )}
        </div>


        <div style={{ position: 'absolute', bottom: '16px', left: '13px', }}>
          <Button type="primary" shape="circle" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? (
              <SunMoon size={16} color="#2d1c3b" strokeWidth={1} />
            ) : (
              <MoonStar size={16} color="#2d1c3b" strokeWidth={1} />
            )}
          </Button>
        </div>

      </Sider>
    </Layout>
  );
};

SidebarNav.propTypes = {
  isDarkMode: PropTypes.bool.isRequired,
  setIsDarkMode: PropTypes.func.isRequired,
};

export default SidebarNav;
