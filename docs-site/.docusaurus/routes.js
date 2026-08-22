import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/__docusaurus/debug',
    component: ComponentCreator('/__docusaurus/debug', '5ff'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/config',
    component: ComponentCreator('/__docusaurus/debug/config', '5ba'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/content',
    component: ComponentCreator('/__docusaurus/debug/content', 'a2b'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/globalData',
    component: ComponentCreator('/__docusaurus/debug/globalData', 'c3c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/metadata',
    component: ComponentCreator('/__docusaurus/debug/metadata', '156'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/registry',
    component: ComponentCreator('/__docusaurus/debug/registry', '88c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/routes',
    component: ComponentCreator('/__docusaurus/debug/routes', '000'),
    exact: true
  },
  {
    path: '/',
    component: ComponentCreator('/', '4dd'),
    routes: [
      {
        path: '/',
        component: ComponentCreator('/', 'a23'),
        routes: [
          {
            path: '/',
            component: ComponentCreator('/', '997'),
            routes: [
              {
                path: '/architecture/data-model',
                component: ComponentCreator('/architecture/data-model', '166'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/architecture/overview',
                component: ComponentCreator('/architecture/overview', '4fe'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/architecture/tech-stack',
                component: ComponentCreator('/architecture/tech-stack', 'f77'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/category/architecture',
                component: ComponentCreator('/category/architecture', '8d4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/category/getting-started',
                component: ComponentCreator('/category/getting-started', '685'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/contributing',
                component: ComponentCreator('/contributing', '641'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/getting-started/backend',
                component: ComponentCreator('/getting-started/backend', '80e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/getting-started/frontend',
                component: ComponentCreator('/getting-started/frontend', '2ea'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/',
                component: ComponentCreator('/', 'fc9'),
                exact: true,
                sidebar: "tutorialSidebar"
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
