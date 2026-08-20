/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Design',
      items: [
        'architecture',
        'database-schema',
        'ui-design',
      ],
    },
    'api-reference',
    'getting-started',
    'roadmap',
  ],
};

export default sidebars;
