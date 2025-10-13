
import React from 'react';

const TagIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v6a2 2 0 002 2h5l7 7V5a2 2 0 00-2-2h-5a2 2 0 00-2 2v2" />
  </svg>
);

export default TagIcon;
