import { Outlet } from "react-router-dom";
import { Content } from "../../components/Content";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { Sidebar } from "../../components/Sidebar";

const Root = () => {
  return (
    <div className='flex flex-col min-h-screen bg-primary text-white'>
      <Header />
      <div className='flex flex-1'>
        <Sidebar />
        <Content>
          <Outlet />
        </Content>
      </div>
      <Footer />
    </div>
  );
};

export default Root;
