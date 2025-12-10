import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
export function Terms() {
  return (
    <Card>
      <CardHeader><CardTitle>Terms & Conditions</CardTitle></CardHeader>
      <CardContent className="prose max-w-none">
        <p>[Version 1.0 • Last updated: 2025‑10‑31]</p>
        <p>Short placeholder. Insert legal text here.</p>
      </CardContent>
    </Card>
  );
}

export function Privacy() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy Policy</CardTitle>
      </CardHeader>

      <CardContent className="prose max-w-none">
        <p>[Version 1.0 • Last updated: 2025-10-31]</p>

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
              Ethereum ERC-4337 Account Abstraction, using Falcon-1024 (Keccak
              variant) for quantum-resistant digital signatures.
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
            <p>Where we are legally required to process data, we do so under one or more lawful bases:</p>
            <ul>
              <li>Consent - You have clearly agreed to the processing.</li>
              <li>
                Legal Obligation - There is a requirement to comply with
                applicable laws (e.g., AML/KYC, taxation, or regulatory
                reporting).
              </li>
            </ul>
          </li>

          <li>
            <h2>Data Security</h2>
            <p>
              Security is central to our mission. We employ post-quantum
              cryptography (Falcon-1024), end-to-end encryption, and strict
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
            <h2>Data Retention</h2>
            <p>
              We retain information only for as long as necessary to fulfil its
              intended purpose or to meet legal requirements. Once the purpose
              expires, data is securely deleted or anonymised in compliance with
              GDPR retention guidelines.
            </p>
            <p>
              Blockchain data cannot be deleted, but we will not associate any
              personal identifiers with it unless explicitly required by law.
            </p>
          </li>

          <li>
            <h2>Your Rights</h2>
            <p>If you have provided data under consent, you retain rights under the UK GDPR, including:</p>
            <ul>
              <li>Access your information</li>
              <li>Correct inaccuracies</li>
              <li>Request deletion</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p>Requests can be made by contacting us using the details below.</p>
          </li>

          <li>
            <h2>International Data Transfers</h2>
            <p>
              If any data is processed outside the United Kingdom, we will
              ensure that such transfers comply with applicable data protection
              laws and appropriate safeguards.
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
              Cointrol Limited<br />
              Registered in the United Kingdom<br />
              Email: info@cointrol.co.uk<br />
              Address: 21 Tressillian Crescent, London, SE4 1QJ (mail enquiries
              only)
            </p>
          </li>
        </ol>
      </CardContent>
    </Card>
  );
}
