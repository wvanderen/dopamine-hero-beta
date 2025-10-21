import { NextPage } from 'next';
import Head from 'next/head';

const HomePage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Dopamine Hero</title>
        <meta name="description" content="A gamified productivity application" />
      </Head>
      <main style={{ padding: '2rem' }}>
        <h1>Welcome to Dopamine Hero</h1>
        <p>Environment setup is working!</p>
      </main>
    </>
  );
};

export default HomePage;
