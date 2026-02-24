import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useNavigate, Link } from "react-router-dom";

export function Terms() {
  const navigate = useNavigate();
  return (
    <Card className="flex flex-row items-center justify-between">
      <CardHeader>
        <CardTitle>Terms & Conditions</CardTitle>
      
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
        </CardHeader>
      <CardContent className="overflow-y-auto prose px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
        <p>[Version 1.0 • Last updated: 2026-02-24]</p>
        <ol className="list-decimal pl-4 space-y-8">
          <li>
            <h2>Introduction</h2>
            <p>
              These Terms and Conditions (“Terms”) govern your use of the Cointrol platform, 
              applications, APIs, smart contracts, websites, and related services (collectively, 
              the “Services”) operated by Cointrol Limited (“Cointrol”, “we”, “us”, or “our”).
            </p>
            <p>
              By accessing or using the Services, you agree to be bound by these Terms.
            </p>
            <p>
              If you do not agree, you must not use the Services
            </p>
          </li>
          <li>
            <h2>Non-Custodial Nature of the Services</h2>
            <p>
              Cointrol provides non-custodial wallet and transaction infrastructure. We do not:
            </p>
            <ul>
              <li>
                hold customer funds,
              </li>
              <li>
                control private keys,
              </li>
              <li>
                initiate transactions on your behalf without cryptographic authorisation,
              </li>
              <li>
                act as trustee, custodian, or fiduciary.
              </li>
            </ul>
            <p>
              You retain sole control of:
            </p>
            <ul>
              <li>private keys</li>
              <li>recovery material</li>
              <li>transaction approvals</li>
              <li>digital assets</li>
            </ul>
            <p>
              You acknowledge that loss of keys or credentials may result in permanent loss 
              of access to assets.
            </p>
          </li>
          <li>
            <h2>Blockchain Risks and Irreversibility</h2>
            <p>
              You acknowledge that:
            </p>
            <ul>
              <li>
                blockchain transactions are irreversible;
              </li>
              <li>
                confirmations times depend on external networks;
              </li>
              <li>
                smart contracts may behave unexpectedly;
              </li>
              <li>
                congestion, forks, validator failures, or chain reorganisations may occur.
              </li>
            </ul>
            <p>
              Cointrol does not guarantee:
            </p>
            <ul>
              <li>transaction finality,</li>
              <li>confirmation speed,</li>
              <li>network availability,</li>
              <li>asset recovery.</li>
            </ul>
            <p>
              use of blockchain technology is at your own risk.
            </p>
          </li>
          <li>
            <h2>Testnet Disclaimer (where applicable)</h2>
            <p>
              Where Services operate on test networks:
            </p>
            <ul>
              <li>assets have no real-world value;</li>
              <li>data may be reset or deleted;</li>
              <li>addresses must not be reused on mainnet.</li>
            </ul>
            <p>
              Testnet environments are provided strictly for development and evalutation.
            </p>
          </li>
          <li>
            <h2>Artificial Intelligence &amp; Cryptography</h2>
            <p>
              Certain components of the services may utilise:
            </p>
            <ul>
              <li>artificial intelligence,</li>
              <li>automated agents,</li>
              <li>cryptographic systems including post-quantum algorithms.</li>
            </ul>
            <p>
              You acknowledge that::
            </p>
            <ul>
              <li>AI-generated outputs are probabilistic and may contain errors;</li>
              <li>cryptographic systems may evolve as standards develop;</li>
              <li>no cryptographic system is guaranteed to remain secure indefinitely.</li>
            </ul>
            <p>
              Any outputs or recommendations are provided for informational purposes only and must
              be independently verified.
            </p>
          </li>
          <li>
            <h2>No Financial, Legal, or Investment Advice</h2>
            <p>
              Nothing provided through the Services constitutes:
            </p>
            <ul>
              <li>financial advice,</li>
              <li>legal advice,</li>
              <li>tax advice,</li>
              <li>investment advice.</li>
            </ul>
            <p>
              Cointrol does not recommend or endorse any digital asset, protocol, or strategy.
              You are solely responsible for evaluating risks and compliance.
            </p>
          </li>
          <li>
            <h2>User Responsibilities</h2>
            <p>You agree to:</p>
            <ul>
              <li>maintain adequate security over credentials and devices;</li>
              <li>verify all transaction details before approval;</li>
              <li>comply with applicable laws and regulations;</li>
              <li>ensure accuracy of submitted data;</li>
              <li>not misuse or interfere with the services.</li>
            </ul>
            <p>
              You are responsible for all activity authorised through your accounts or keys.
            </p>
          </li>
          <li>
            <h2>Third-Party Networks and Services</h2>
            <p>
              The Services rely on third parties including:
            </p>
            <ul>
              <li>blockchain networks</li>
              <li>RPC providers</li>
              <li>could platforms</li>
              <li>bundlers</li>
              <li>paymasters</li>
              <li>identity or analytics services</li>
            </ul>
            <p>
              Cointrol is not responsible for outages, failures, or acts of these third parties.
            </p>
          </li>
          <li>
            <h2>Intellectual Property</h2>
            <p>We process personal data in accordance with:</p>
            <ul>
              <li>UK GDPR</li>
              <li>Data Protection Act 2018</li>
            </ul>
            <p>
                Our Privacy Policy forms part of these Terms.
                You acknowledge that blockchain data is inherently public and immutable.
            </p>
          </li>
          <li>
            <h2>Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law,
              Cointrol shall not be liable for:
            </p>
            <ul>
              <li>loss of digital assets;</li>
              <li>blockchain failures;</li>
              <li>smart contract behaviour;</li>
              <li>indirect or consequential damages;</li>
              <li>loss of profits, revenue, or business;</li>
              <li>regulatory or tax consequences.</li>
            </ul>
            <p>
                Our total aggregate liability shall not exceed the fees paid by you to Cointrol
                in the twelve (12) months preceding the event giving rise to the claim.
                If no fees were paid, liability is limited to £100.
            </p>
          </li>
          <li>
            <h2>No Warranties</h2>
            <p>
              The Services are provided "as is" and "as available".
            </p>
            <p>
              We expressly disclaim all warranties, including implied warranties of merchantability, fitness
              for purpose, and non-infringement.
            </p>
            <p>
              We do not warrant uninterrupted or error-free operation.
            </p>
          </li>
          <li>
            <h2>Indemnity</h2>
            <p>
              You agree to indemnify Cointrol against claims arising from:
            </p>
            <ul>
              <li>your misuse of the Services;</li>
              <li>violation of law;</li>
              <li>breach of these Terms;</li>
              <li>content or transactions you initiate.</li>
            </ul>
          </li>
          <li>
            <h2>Suspension and Termination</h2>
            <p>
              We may suspend or terminate access where required by law or where use presents security,
              legal, or operational risk.
            </p>
            <p>
              You may cease use at any time.
            </p>
          </li>
          <li>
            <h2>Force Majeure</h2>
            <p>
              Cointrol is not liable for delays or failures caused by events beyond reasonable
              control including:
            </p>
            <ul>
              <li>blockchain outages;</li>
              <li>cyber incidents;</li>
              <li>infrastructure failures;</li>
              <li>regulatory changes;</li>
              <li>acts of war or government.</li>
            </ul>
          </li>
          <li>
            <h2>Changes to Terms</h2>
            <p>
              We may update these Terms periodically. Continued use constitutes acceptance.
            </p>

          </li>
          <li>
            <h2>Governing Law</h2>
            <p>
              These Tems are governed by the laws of England and Wales.
              Courts of England and Wales shall have exclusive jurisdiction.
            </p>
          </li>
        </ol>
        </div>
      </CardContent>
    </Card>
  );
}

export function Privacy() {
  const navigate = useNavigate();

  return (
    <Card className="flex flex-row items-center justify-between">
      <CardHeader>
        <CardTitle>Privacy Policy</CardTitle>
                <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </CardHeader>

      <CardContent className="overflow-y-auto prose px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
        <p>[Version 1.1 • Last updated: 2026-02-19]</p>

        <ol className="list-decimal pl-4 space-y-8">
          <li>
            <h2>Introduction</h2>
            <p>
              Welcome to <strong>Cointrol Limited</strong> (“Cointrol”, “we”, “our”, “us”). We
              are committed to upholding privacy, security, and transparency
              across all of our platforms — including our QuantumAccount wallet,
              Paymaster services, Bundler infrastructure, and related websites,
              APIs, and digital tools (collectively, the “Services”).
            </p>
            <p>
              Cointrol Limited is a UK-registered company developing
              post-quantum, non-custodial wallet infrastructure built on
              Ethereum ERC-4337 Account Abstraction, using Falcon (fips 206) 
              for quantum-resistant digital signatures.
            </p>
            <p>
              We take privacy seriously. This document explains our policy
              regarding the collection, use, and protection of information when
              you interact with our Services.
            </p>
          </li>

          <li>
            <h2>Our Approach to Privacy</h2>
            <p>
              Cointrol is built on the principle of user sovereignty. Our
              architecture is designed so that no personal data is collected,
              stored, or processed by default. Your keys, identities, and
              transactions remain entirely under your control and are managed
              locally on your device or via your connected wallet.
            </p>

            <p>We will only collect or process data if:</p>
            <ul>
              <li>
                It is legally required (e.g., by financial regulations or
                compliance obligations), or
              </li>
              <li>
                You have explicitly consented to its collection for a specific
                purpose (e.g., participation in a token sale, account
                verification, or support request).
              </li>
            </ul>

            <p>When data collection is required, we will:</p>
            <ul>
              <li>Clearly inform you of what data is being collected and why.</li>
              <li>Request your informed consent before processing.</li>
              <li>
                Handle data securely and in accordance with applicable privacy
                laws including the UK GDPR and the Data Protection Act 2018.
              </li>
            </ul>
          </li>

          <li>
            <h2>Information We May Collect (If Applicable)</h2>
            <p>
              While our Services are designed to operate without collecting
              personal data, certain interactions may require limited
              information. Examples include:
            </p>

            <h3>Contact or Support Enquiries</h3>
            <ul>
              <li>Name, email address, message content – to respond to enquiries</li>
            </ul>

            <h3>Regulatory Compliance</h3>
            <ul>
              <li>
                Identity verification documents, proof of address – only if
                legally required (e.g., AML/KYC)
              </li>
            </ul>

            <h3>Website Analytics (optional, if consented)</h3>
            <ul>
              <li>Anonymous usage metrics – to improve system performance only</li>
            </ul>

            <h3>Technical</h3>
            <ul>
              <li>
                IP address, device information, browser type, application logs 
                – for security monitoring and troubleshooting only
              </li>
            </ul>

            <h3>Blockchain Identifiers</h3>
            <ul>
              <li>Wallet addresses, transaction hashes, and network metadata</li>
              <li>Blockchain data is public and not controlled by Cointrol</li>
            </ul>
          </li>

          <li>
            <h2>Smart Contract and Blockchain Data</h2>
            <p>
              All on-chain transactions (including UserOperations, Paymaster
              deposits, and QuantumAccount deployments) are public by design and
              stored on the Ethereum blockchain or compatible networks. Such
              data - wallet addresses, transaction hashes, and smart contract
              interactions - are immutable and beyond our direct control.
            </p>
            <p>
              Public blockchain data is globally replicated and cannot be deleted nor modified.
            </p>
            <p>
              Cointrol does not link any blockchain addresses to real-world
              identities unless required by regulation and supported by user
              consent.
            </p>
          </li>

          <li>
            <h2>Cookies and Local Storage</h2>
            <p>
              Our website may use minimal local storage to maintain
              functionality (for example, session preferences or authentication
              tokens). We do not use tracking cookies, third-party advertising
              scripts, or analytics platforms that profile users. Where optional
              analytics are used (e.g., self-hosted performance metrics), they
              will be anonymised and clearly disclosed.
            </p>
          </li>

          <li>
            <h2>Legal Basis for Processing</h2>
            <p>Where we are legally required to process data, we do so under 
              one or more lawful bases:</p>
            <ul>
              <li>Consent - You have clearly agreed to the processing.</li>
              <li>
                Legal Obligation - There is a requirement to comply with
                applicable laws (e.g., AML/KYC, taxation, or regulatory
                reporting).
              </li>
              <li>
                Contract Performance  </li>
              <li>
                Legitimate Interests - Security, fraud prevention, service improvement.  </li>
            </ul>
          </li>

          <li>
            <h2>Data Security</h2>
            <p>
              Security is central to our mission. We employ post-quantum
              cryptography (Falcon-512 and Falcon-1024), end-to-end encryption, and strict
              access controls for any system components that might process
              user-submitted data.
            </p>
            <p>
              When we engage service providers (e.g., cloud hosting, email, or
              payment gateways), we ensure that they meet or exceed industry
              security standards and comply with applicable data protection laws.
            </p>
          </li>

          <li>
            <h2>How We Use Your Data</h2>  
            <p>We use data to:</p>
            <ul>
              <li>operate and secure services</li>
              <li>provide support</li>
              <li>comply with legal obligations</li>
              <li>detect fraud or abuse</li>
              <li>improve platform functionality</li>
            </ul>
            <p>We do not sell personal data</p>
          </li>

          <li>
            <h2>Data Retention</h2>
            <p>
              We retain information only for as long as necessary to fulfil its
              intended purpose or to meet legal requirements, operational requirements, 
              or for dispute resolution. Once the purpose expires, data is securely 
              deleted or anonymised in compliance with GDPR retention guidelines.
            </p>
            <p>
              Blockchain data cannot be deleted, but we will not associate any
              personal identifiers with it unless explicitly required by law.
            </p>
          </li>

          <li>
            <h2>Sharing Information</h2>  
            <p>We may share data with:</p>
            <ul>
              <li>infrastructure providers</li>
              <li>analytics providers</li>
              <li>professional advisors</li>
              <li>regulators (where legally required)</li>
            </ul>
            <p>All processors are contractually bound to confidentiality.</p>
          </li>

          <li>
            <h2>Your Rights</h2>
            <p>If you have provided data to us under consent, you retain full rights 
              under the UK GDPR, including the right to:</p>
            <ul>
              <li>Access your information</li>
              <li>Correct inaccuracies</li>
              <li>Request deletion of your data (off-chain only)</li>
              <li>Withdraw consent at any time</li>
              <li>Restriction </li>
              <li>Objection  </li>
              <li>Portability  </li>
            </ul>
            <p>Requests can be made by contacting us using the details below.</p>
          </li>

          <li>
            <h2>Security</h2>
            <p>
              We use technical and organiational safeguards including encryption, 
              access controls, and monitoring.  However, no system is completely secure.
            </p>
          </li>

          <li>
            <h2>International Data Transfers</h2>
            <p>
              If any data is processed outside the United Kingdom, we will
              ensure that such transfers are made in compliance with applicable
              data protection laws and appropriate safeguards.
            </p>
            <p>
              Where applciable, we use UK adequacy regulations and standard constractual clauses.
            </p>
          </li>

          <li>
            <h2>Updates to This Policy</h2>
            <p>
              We may occasionally update this Privacy Policy to reflect changes
              in regulation or operational practices. All updates will be
              published on our website with a revised “Last Updated” date.
            </p>
          </li>

          <li>
            <h2>Contact Information</h2>
            <p>
              For questions, requests, or concerns regarding this Privacy Policy, please contact us at:
            </p>
            <p>
              Cointrol Limited<br />
              Registered in the United Kingdom<br />
              Email: info@cointrol.co.uk<br />
              Address: 21 Tressillian Crescent, London, SE4 1QJ (mail enquiries
              only)
            </p>
          </li>
        </ol>
        </div>
      </CardContent>
    </Card>
  );
}
