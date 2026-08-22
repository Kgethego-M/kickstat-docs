// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Kickstat',
  tagline: 'Sport Coaching Tool — manage squads, events, and live match data',
  favicon: 'img/favicon.ico',

  url: 'https://bug-off.gitea.io',
  baseUrl: '/sport-coaching-tool/',

  organizationName: 'bug-off',
  projectName: 'sport-coaching-tool',

  onBrokenLinks: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Kickstat',
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docsSidebar',
            position: 'left',
            label: 'Docs',
          },
          {
            href: 'https://sdpm.ms.wits.ac.za/bug-off/sport-coaching-tool',
            label: 'Gitea',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Documentation',
            items: [
              { label: 'Overview', to: '/' },
              { label: 'Architecture', to: '/architecture' },
              { label: 'API Reference', to: '/api-reference' },
            ],
          },
          {
            title: 'Project',
            items: [
              { label: 'Roadmap', to: '/roadmap' },
              { label: 'Database Schema', to: '/database-schema' },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Kickstat — COMS3011A, University of the Witwatersrand.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
