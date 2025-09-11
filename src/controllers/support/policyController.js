const convertToHtml = (content) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${content.title}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
            body {
                font-family: 'Roboto', sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f9;
                padding: 20px;
                max-width: 800px;
                margin: auto;
            }
            .container {
                background: #fff;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            h1 {
                color: #ff6f61;
                font-size: 2.5em;
                border-bottom: 2px solid #ff6f61;
                padding-bottom: 10px;
                margin-bottom: 20px;
            }
            h2 {
                color: #444;
                font-size: 1.8em;
                margin-top: 30px;
                border-left: 4px solid #ff6f61;
                padding-left: 10px;
            }
            p, ul {
                font-size: 1em;
                margin-bottom: 15px;
            }
            ul {
                padding-left: 20px;
            }
            li {
                margin-bottom: 8px;
            }
            .last-updated {
                font-style: italic;
                color: #777;
                margin-bottom: 20px;
            }
            strong {
                color: #222;
            }
            a {
                color: #ff6f61;
                text-decoration: none;
            }
            a:hover {
                text-decoration: underline;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>${content.title}</h1>
            <p class="last-updated">Last updated: ${content.lastUpdated}</p>
            ${content.sections.map(section => `
                <h2>${section.title}</h2>
                <p>${section.content.replace(/\n/g, '<br>')}</p>
            `).join('')}
        </div>
    </body>
    </html>
    `;
};

exports.getPrivacyPolicy = (req, res) => {
    const policyContent = {
        title: "Privacy Policy",
        lastUpdated: "September 10, 2025",
        sections: [
            {
                title: "Introduction",
                content: "Ks Home Foods & Shopping (\"we,\" \"our,\" or \"us\") is committed to protecting the privacy of our users. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application (the \"App\"). Please read this policy carefully. By using the App, you agree to the terms of this Privacy Policy. If you do not agree, please do not use our App."
            },
            {
                title: "Information We Collect",
                content: "We may collect personal information that you voluntarily provide to us when you register on the App, place an order, or use the support ticket system. The types of information we may collect include:\n" +
                         "•  **Personal Identification Information:** Name, email address, phone number.\n" +
                         "•  **Address and Location Information:** Delivery address, precise location data (with your consent) for food delivery services.\n" +
                         "•  **Order Information:** Details of your food and shopping orders, order history.\n" +
                         "•  **Payment Information:** While we currently offer Cash on Delivery (COD), we may collect payment information (e.g., credit/debit card details) in the future to process transactions through a secure third-party payment gateway. We do not store this sensitive payment data on our servers.\n" +
                         "•  **Support Information:** Details related to any support tickets you raise, including the nature of the issue and communication history."
            },
            {
                title: "How We Use Your Information",
                content: "We use the information we collect to:\n" +
                         "•  Process and fulfill your food and shopping orders.\n" +
                         "•  Deliver your food and shopping items to the correct address.\n" +
                         "•  Provide customer support, including responding to your support tickets.\n" +
                         "•  Improve our services and enhance your user experience.\n" +
                         "•  Communicate with you about your orders, special offers, and app updates.\n" +
                         "•  Monitor and analyze usage and trends to improve our App's functionality."
            },
            {
                title: "Disclosure of Your Information",
                content: "We may share your information with third parties only in the following situations:\n" +
                         "•  **Service Providers:** We may share your information with third-party vendors, such as delivery partners, to perform services on our behalf. These partners are required to use your information only as necessary to provide these services.\n" +
                         "•  **Payment Processors:** When we introduce a payment gateway, your payment information will be securely handled by third-party payment processors.\n" +
                         "•  **Legal Obligations:** We may disclose your information if required to do so by law or in response to a valid request from government authorities."
            },
            {
                title: "Data Security",
                content: "We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse."
            },
            {
                title: "Your Rights",
                content: "You have certain rights regarding your personal information, subject to local law. These may include the right to access, correct, or delete your data. For any requests or inquiries regarding your data, please raise a support ticket within the App."
            },
            {
                title: "Changes to This Privacy Policy",
                content: "We reserve the right to make changes to this Privacy Policy at any time and for any reason. We will alert you about any changes by updating the 'Last Updated' date of this policy. You are encouraged to periodically review this Privacy Policy to stay informed of updates. Your continued use of the App after any changes signifies your acceptance of the new terms."
            },
            {
                title: "Contact Us",
                content: "If you have questions or comments about this Privacy Policy, you can reach out to us via the support ticket feature in the App."
            }
        ]
    };
    res.send(convertToHtml(policyContent));
};

exports.getTermsAndConditions = (req, res) => {
    const termsContent = {
        title: "Terms and Conditions",
        lastUpdated: "September 10, 2025",
        sections: [
            {
                title: "Introduction",
                content: "Welcome to Ks Home Foods & Shopping! These Terms and Conditions (\"Terms\") govern your use of our mobile application (the \"App\"). By accessing or using the App, you agree to be bound by these Terms. If you do not agree to all the Terms, do not use the App."
            },
            {
                title: "Services Offered",
                content: "Our App provides two primary services:\n" +
                         "•  **Food Delivery:** We offer freshly prepared homemade food for delivery to specified nearby areas.\n" +
                         "•  **Shopping:** We provide a curated selection of shopping items for delivery across India."
            },
            {
                title: "Order and Delivery",
                content: "•  **Food Delivery:** Food orders are delivered only within the delivery areas specified in the App. Delivery times can vary but are typically within 3 to 5 hours from order confirmation.\n" +
                         "•  **Shopping:** Shopping orders are delivered all over India. Delivery times can range from 3 hours up to 7 days, depending on the product, its availability, and your location."
            },
            {
                title: "Payment",
                content: "We currently accept **Cash on Delivery (COD)** for all orders. We are working on integrating a secure third-party payment gateway in the future to provide more payment options. Once a payment gateway is implemented, its use will be subject to the terms and conditions of that third-party provider."
            },
            {
                title: "User Account",
                content: "You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account."
            },
            {
                title: "Support and Communication",
                content: "You can raise a support ticket within the App for any issues or queries related to your orders or our services. We will strive to address your concerns in a timely manner."
            },
            {
                title: "Limitation of Liability",
                content: "The App and all services are provided on an \"as is\" and \"as available\" basis. We disclaim all warranties of any kind, whether express or implied. In no event shall Ks Home Foods & Shopping be liable for any direct, indirect, incidental, special, or consequential damages arising from your use of the App or services."
            },
            {
                title: "Changes to These Terms",
                content: "We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of such changes by updating the 'Last Updated' date. Your continued use of the App following the posting of any changes constitutes acceptance of those changes."
            },
            {
                title: "Governing Law",
                content: "These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions."
            }
        ]
    };
    res.send(convertToHtml(termsContent));
};