import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/sport-coaching-tool/',
    component: ComponentCreator('/sport-coaching-tool/', 'bd8'),
    routes: [
      {
        path: '/sport-coaching-tool/',
        component: ComponentCreator('/sport-coaching-tool/', '096'),
        routes: [
          {
            path: '/sport-coaching-tool/',
            component: ComponentCreator('/sport-coaching-tool/', '12a'),
            routes: [
              {
                path: '/sport-coaching-tool/api-reference',
                component: ComponentCreator('/sport-coaching-tool/api-reference', '122'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/sport-coaching-tool/architecture',
                component: ComponentCreator('/sport-coaching-tool/architecture', 'ab3'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/sport-coaching-tool/database-schema',
                component: ComponentCreator('/sport-coaching-tool/database-schema', '148'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/sport-coaching-tool/getting-started',
                component: ComponentCreator('/sport-coaching-tool/getting-started', 'db9'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/sport-coaching-tool/roadmap',
                component: ComponentCreator('/sport-coaching-tool/roadmap', '5d8'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/sport-coaching-tool/ui-design',
                component: ComponentCreator('/sport-coaching-tool/ui-design', '42b'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/sport-coaching-tool/',
                component: ComponentCreator('/sport-coaching-tool/', '33c'),
                exact: true,
                sidebar: "docsSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
