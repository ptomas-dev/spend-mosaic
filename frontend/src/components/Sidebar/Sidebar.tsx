import { NavLink } from "react-router-dom";
import { navigationItems } from "../../application/navigation";

const Sidebar = () => {
  const styles = {
    base: "w-auto text-center text-sky-500 p-4 border-b border-secondary text-xl cursor-pointer hover:bg-secondary hover:text-white uppercase",
    selected:
      "w-auto text-center text-white p-4 border-b border-secondary text-xl cursor-pointer bg-secondary uppercase",
  };

  return (
    <aside className='border-r border-secondary w-64 '>
      <nav aria-label='Main navigation'>
        <ul className=''>
          {navigationItems.map(({ path, label, end }) => (
            <li key={path}>
              <NavLink
                to={path}
                end={end}
                className={({ isActive }) =>
                  `block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-500 ${isActive ? styles.selected : styles.base}`
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
