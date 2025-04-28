const { subject } = require('@casl/ability');
const midtransClient = require('midtrans-client');
const Invoice = require('../models/Invoice');
const Order = require('../models/Order');
const { policyFor } = require('../policies');
const config = require('../config');

let snap = new midtransClient.Snap({
  isProduction: config.midtrans.isProduction,
  serverKey: config.midtrans.serverKey,
  clientKey: config.midtrans.clientKey,
});

async function show(req, res) {
  try {
    const { order_id } = req.params;
    const invoice = await Invoice.findOne({ order: order_id }).populate('order').populate('user');

    if (!invoice) {
      return res.status(404).json({ error: 1, message: 'Invoice not found' });
    }

    const policy = policyFor(req.user);
    const subjectInvoice = subject('Invoice', { ...invoice.toObject(), user_id: invoice.user._id });

    if (!policy.can('read', subjectInvoice)) {
      return res.status(403).json({ error: 1, message: 'Access denied.' });
    }

    return res.json(invoice);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 1, message: 'Error fetching invoice.' });
  }
}

async function initiatePayment(req, res) {
  try {
    const { order_id } = req.params;
    const invoice = await Invoice.findOne({ order: order_id }).populate('order').populate('user');

    if (!invoice) {
      return res.status(404).json({ error: 1, message: 'Invoice not found' });
    }

    const parameter = {
      transaction_details: {
        order_id: invoice.order._id.toString(),
        gross_amount: invoice.total,
      },
      credit_card: {
        secure: true,
      },
      customer_details: {
        first_name: invoice.user.full_name,
        email: invoice.user.email,
      },
    };

    const response = await snap.createTransaction(parameter);

    return res.json(response);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 1, message: 'Error initiating payment.' });
  }
}

async function handleMidtransNotification(req, res) {
  try {
    const statusResponse = await snap.transaction.notification(req.body);
    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;

    if (transactionStatus === 'capture') {
      if (fraudStatus === 'challenge' || fraudStatus === 'accept') {
        await Invoice.findOneAndUpdate({ order: orderId }, { payment_status: 'paid' });
        await Order.findByIdAndUpdate(orderId, { status: 'processing' });
      }
    } else if (transactionStatus === 'settlement') {
      await Invoice.findOneAndUpdate({ order: orderId }, { payment_status: 'paid' });
      await Order.findByIdAndUpdate(orderId, { status: 'delivered' });
    }

    return res.json('success');
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 1, message: 'Error handling notification.' });
  }
}

module.exports = {
  show,
  initiatePayment,
  handleMidtransNotification,
};
