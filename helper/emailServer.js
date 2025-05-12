import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import ejs from 'ejs';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_PASSWORD
    }
});

export async function sendEmail(to, subject, template, data) {
    try {
        const html = await ejs.renderFile(new URL(`../views/${template}.ejs`, import.meta.url), data, { async: true });

        const mailOptions = {
            from: 'ruzwanali008@gmail.com', // Replace with your email
            to,
            subject,
            html
        };

        await transporter.sendMail(mailOptions);
        console.log('Message sent successfully!');
    } catch (err) {
        console.log('Error: ', err);
    }
}
