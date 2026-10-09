import type { PropsWithChildren } from "react";

const Content = ({ children }: PropsWithChildren) => {
  return <main className='flex-1 p-6'>{children}</main>;
};

export default Content;
