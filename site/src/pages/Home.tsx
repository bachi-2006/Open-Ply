import Navbar from '../components/Navbar'
import LoadingScreen from '../components/LoadingScreen'
import Hero from '../components/Hero'
import TerminalDemo from '../components/TerminalDemo'
import Features from '../components/Features'
import HowItWorks from '../components/HowItWorks'
import IDEPreview from '../components/IDEPreview'
import Models from '../components/Models'
import Compare from '../components/Compare'
import MCPServer from '../components/MCPServer'
import Plugins from '../components/Plugins'
import VSCodeInstall from '../components/VSCodeInstall'
import Contact from '../components/Contact'
import CTA from '../components/CTA'
import Footer from '../components/Footer'

export default function Home() {
  return (
    <>
      <LoadingScreen />
      <Navbar />
      <main className="pt-[72px]">
        <Hero />
        <TerminalDemo />
        <Features />
        <HowItWorks />
        <IDEPreview />
        <Models />
        <MCPServer />
        <Plugins />
        <Compare />
        <VSCodeInstall />
        <Contact />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
