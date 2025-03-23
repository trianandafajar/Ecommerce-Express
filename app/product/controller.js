const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const Product = require("./model");
const Category = require("../category/model");
const Tag = require("../tag/model");
const config = require("../config");
const { policyFor } = require("../policy");

async function index(req, res, next) {
  try {
    let { limit = 10, skip = 0, q = "", category = "", tags = [] } = req.query;

    let criteria = {};

    if (q.length) {
      criteria.name = { $regex: q, $options: "i" };
    }

    if (category.length) {
      category = await Category.findOne({ name: { $regex: category, $options: "i" } }).lean();
      if (category) criteria.category = category._id;
    }

    if (tags.length) {
      tags = await Tag.find({ name: { $in: tags } }).lean();
      criteria.tags = { $in: tags.map((tag) => tag._id) };
    }

    let count = await Product.countDocuments(criteria);

    let products = await Product.find(criteria)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate("category")
      .populate("tags")
      .lean(); // Gunakan `lean()` untuk performa lebih baik

    return res.json({ data: products, count });
  } catch (err) {
    next(err);
  }
}

async function store(req, res, next) {
  try {
    let policy = policyFor(req.user);
    if (!policy.can("create", "Product")) {
      return res.status(403).json({ error: 1, message: "Anda tidak memiliki akses untuk membuat produk" });
    }

    let payload = req.body;

    if (payload.category) {
      let category = await Category.findOne({ name: { $regex: payload.category, $options: "i" } }).lean();
      if (category) payload.category = category._id;
      else delete payload.category;
    }

    if (payload.tags?.length) {
      let tags = await Tag.find({ name: { $in: payload.tags } }).lean();
      if (tags.length) payload.tags = tags.map((tag) => tag._id);
    }

    if (req.file) {
      let tmp_path = req.file.path;
      let originalExt = path.extname(req.file.originalname);
      let filename = `${req.file.filename}${originalExt}`;
      let target_path = path.resolve(config.rootPath, `public/upload/${filename}`);

      fs.rename(tmp_path, target_path, async (err) => {
        if (err) return next(err);

        try {
          let product = new Product({ ...payload, image_url: filename });
          await product.save();
          return res.status(201).json(product);
        } catch (err) {
          fs.unlink(target_path, () => {}); // Hindari error jika file tidak ada
          return res.status(400).json({ error: 1, message: err.message, fields: err.errors });
        }
      });
    } else {
      let product = new Product(payload);
      await product.save();
      return res.status(201).json(product);
    }
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    let policy = policyFor(req.user);
    if (!policy.can("update", "Product")) {
      return res.status(403).json({ error: 1, message: "Anda tidak memiliki akses untuk mengupdate produk" });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 1, message: "ID produk tidak valid" });
    }

    let payload = req.body;

    if (payload.category) {
      let category = await Category.findOne({ name: { $regex: payload.category, $options: "i" } }).lean();
      if (category) payload.category = category._id;
      else delete payload.category;
    }

    if (payload.tags?.length) {
      let tags = await Tag.find({ name: { $in: payload.tags } }).lean();
      if (tags.length) payload.tags = tags.map((tag) => tag._id);
    }

    let product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 1, message: "Produk tidak ditemukan" });
    }

    if (req.file) {
      let tmp_path = req.file.path;
      let originalExt = path.extname(req.file.originalname);
      let filename = `${req.file.filename}${originalExt}`;
      let target_path = path.resolve(config.rootPath, `public/upload/${filename}`);

      fs.rename(tmp_path, target_path, async (err) => {
        if (err) return next(err);

        if (product.image_url) {
          let oldImage = path.resolve(config.rootPath, `public/upload/${product.image_url}`);
          if (fs.existsSync(oldImage)) {
            fs.unlink(oldImage, () => {});
          }
        }

        let updatedProduct = await Product.findByIdAndUpdate(req.params.id, { ...payload, image_url: filename }, { new: true, runValidators: true });
        return res.json(updatedProduct);
      });
    } else {
      let updatedProduct = await Product.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
      return res.json(updatedProduct);
    }
  } catch (err) {
    return next(err);
  }
}

async function destroy(req, res, next) {
  try {
    let policy = policyFor(req.user);
    if (!policy.can("delete", "Product")) {
      return res.status(403).json({ error: 1, message: "Anda tidak memiliki akses untuk menghapus produk" });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 1, message: "ID produk tidak valid" });
    }

    let product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 1, message: "Produk tidak ditemukan" });
    }

    if (product.image_url) {
      let imagePath = path.resolve(config.rootPath, `public/upload/${product.image_url}`);
      if (fs.existsSync(imagePath)) {
        fs.unlink(imagePath, () => {});
      }
    }

    return res.json({ message: "Produk berhasil dihapus", data: product });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  index,
  store,
  update,
  destroy,
};
