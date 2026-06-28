import midtransClient from "midtrans-client";
import Order from "../modals/orderModal.js";
import 'dotenv/config';

// 🔹 Inisialisasi Midtrans Snap Client
const snap = new midtransClient.Snap({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// ========================= CREATE ORDER =========================
export const createOrder = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      email,
      address,
      city,
      zipCode,
      paymentMethod,
      subtotal,
      tax,
      total,
      items,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Invalid or empty items array" });
    }

    // Map item agar sesuai schema Order kamu
    const orderItems = items.map(({ item, name, price, imageUrl, quantity }) => {
      const base = item || {};
      return {
        item: {
          name: base.name || name || "Unknown Item",
          price: Number(base.price ?? price) || 0,
          imageUrl: base.imageUrl || imageUrl || "",
        },
        quantity: Number(quantity) || 1,
      };
    });

    const shippingCost = 0;
    const method = paymentMethod;
    let newOrder;

if (method === "online") {
  const orderId = "ORDER-" + Date.now();

  // Hitung total item utama
  const itemDetails = orderItems.map((o) => ({
    id: o.item.name,
    price: Math.round(o.item.price),
    quantity: o.quantity,
    name: o.item.name,
  }));

  // Tambahkan tax dan shipping sebagai item terpisah
  if (tax && tax > 0) {
    itemDetails.push({
      id: "TAX",
      price: Math.round(tax),
      quantity: 1,
      name: "Tax",
    });
  }

  if (shippingCost && shippingCost > 0) {
    itemDetails.push({
      id: "SHIPPING",
      price: Math.round(shippingCost),
      quantity: 1,
      name: "Shipping Cost",
    });
  }

  // Hitung total pasti sama
  const grossAmount = itemDetails.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: grossAmount,
    },
    item_details: itemDetails,
    customer_details: {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      shipping_address: {
        address,
        city,
        postal_code: zipCode,
      },
    },
  };

  console.log("✅ Midtrans Payload:", JSON.stringify(parameter, null, 2));

  const transaction = await snap.createTransaction(parameter);

      newOrder = new Order({
        user: req.user?._id,
        firstName,
        lastName,
        phone,
        email,
        address,
        city,
        zipCode,
        paymentMethod: method,
        subtotal,
        tax,
        total,
        shipping: shippingCost,
        items: orderItems,
        paymentStatus: "pending",
        midtransOrderId: orderId,
        snapToken: transaction.token,
      });

      await newOrder.save();

      return res.status(201).json({
        order: newOrder,
        checkoutUrl: transaction.redirect_url, // Redirect ke halaman pembayaran Midtrans
      });
    }

    // Jika COD / e-wallet manual
    newOrder = new Order({
      user: req.user?._id,
      firstName,
      lastName,
      phone,
      email,
      address,
      city,
      zipCode,
      paymentMethod: method,
      subtotal,
      tax,
      total,
      shipping: shippingCost,
      items: orderItems,
      paymentStatus: method === "cod" ? "succeeded" : "pending",
    });

    await newOrder.save();
    res.status(201).json({ order: newOrder, checkoutUrl: null });
  } catch (error) {
    console.error("CreateOrder Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ========================= CONFIRM PAYMENT =========================
export const confirmPayment = async (req, res) => {
  try {
    const { order_id } = req.query;
    if (!order_id) {
      return res.status(400).json({ message: "order_id required" });
    }

    const statusResponse = await snap.transaction.status(order_id);
    console.log("Midtrans status:", statusResponse.transaction_status);

    if (
      statusResponse.transaction_status === "capture" ||
      statusResponse.transaction_status === "settlement"
    ) {
      const order = await Order.findOneAndUpdate(
        { midtransOrderId: order_id },
        { paymentStatus: "succeeded" },
        { new: true }
      );

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      return res.json({ message: "Payment successful", order });
    } else if (statusResponse.transaction_status === "pending") {
      return res.json({ message: "Payment pending", status: "pending" });
    } else {
      return res.json({ message: "Payment failed or canceled" });
    }
  } catch (err) {
    console.error("confirmPayment Error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// ========================= GET USER ORDERS =========================
export const getOrders = async (req, res) => {
  try {
    const filter = { user: req.user._id };
    const rawOrders = await Order.find(filter).sort({ createdAt: -1 }).lean();

    const formatted = rawOrders.map((o) => ({
      ...o,
      items: o.items.map((i) => ({
        _id: i._id,
        item: i.item,
        quantity: i.quantity,
      })),
      createdAt: o.createdAt,
      paymentStatus: o.paymentStatus,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("getOrders Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ========================= GET ALL ORDERS (ADMIN) =========================
export const getAllOrders = async (req, res) => {
  try {
    const raw = await Order.find({}).sort({ createdAt: -1 }).lean();

    const formatted = raw.map((o) => ({
      _id: o._id,
      user: o.user,
      firstName: o.firstName,
      lastName: o.lastName,
      email: o.email,
      phone: o.phone,
      address: o.address ?? o.shippingAddress?.address ?? "",
      city: o.city ?? o.shippingAddress?.city ?? "",
      zipCode: o.zipCode ?? o.shippingAddress?.zipCode ?? "",
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      status: o.status,
      createdAt: o.createdAt,
      items: o.items.map((i) => ({
        _id: i._id,
        item: i.item,
        quantity: i.quantity,
      })),
    }));

    res.json(formatted);
  } catch (error) {
    console.error("getAllOrder Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ========================= UPDATE ORDER (ADMIN) =========================
export const updateAnyOrder = async (req, res) => {
  try {
    const updated = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("updateAnyOrder Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ========================= GET ORDER BY ID =========================
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (!order.user.equals(req.user._id)) {
      return res.status(403).json({ message: "Access Denied" });
    }

    if (req.query.email && order.email !== req.query.email) {
      return res.status(403).json({ message: "Access Denied" });
    }

    res.json(order);
  } catch (error) {
    console.error("getOrderById Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ========================= UPDATE ORDER (USER) =========================
export const updateOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (!order.user.equals(req.user._id)) {
      return res.status(403).json({ message: "Access Denied" });
    }

    if (req.body.email && order.email !== req.body.email) {
      return res.status(403).json({ message: "Access Denied" });
    }

    const updated = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.json(updated);
  } catch (error) {
    console.error("updateOrder Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
