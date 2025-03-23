const Tag = require("./model");
const { policyFor } = require("../policy");
const mongoose = require("mongoose");

async function store(req, res, next) {
  try {
    let policy = policyFor(req.user);
    if (!policy.can("create", "Tag")) {
      return res.status(403).json({
        error: 1,
        message: "Anda tidak memiliki akses untuk membuat tag",
      });
    }

    let payload = req.body;
    let tag = new Tag(payload);
    await tag.save();

    return res.status(201).json(tag); // Gunakan status 201 untuk created
  } catch (err) {
    if (err?.name === "ValidationError") {
      return res.status(400).json({
        error: 1,
        message: err.message,
        fields: err.errors,
      });
    }
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    let policy = policyFor(req.user);
    if (!policy.can("update", "Tag")) {
      return res.status(403).json({
        error: 1,
        message: "Anda tidak memiliki akses untuk mengupdate tag",
      });
    }

    // Pastikan ID valid sebelum query ke database
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: 1,
        message: "ID tag tidak valid",
      });
    }

    let payload = req.body;
    let tag = await Tag.findOneAndUpdate(
      { _id: req.params.id },
      payload,
      { new: true, runValidators: true }
    ).lean(); // Gunakan `lean()` untuk meningkatkan performa

    if (!tag) {
      return res.status(404).json({
        error: 1,
        message: "Tag tidak ditemukan",
      });
    }

    return res.json(tag);
  } catch (err) {
    if (err?.name === "ValidationError") {
      return res.status(400).json({
        error: 1,
        message: err.message,
        fields: err.errors,
      });
    }
    return next(err);
  }
}

async function destroy(req, res, next) {
  try {
    let policy = policyFor(req.user);
    if (!policy.can("delete", "Tag")) {
      return res.status(403).json({
        error: 1,
        message: "Anda tidak memiliki akses untuk menghapus tag",
      });
    }

    // Pastikan ID valid sebelum query ke database
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: 1,
        message: "ID tag tidak valid",
      });
    }

    let tag = await Tag.findOneAndDelete({ _id: req.params.id });

    if (!tag) {
      return res.status(404).json({
        error: 1,
        message: "Tag tidak ditemukan",
      });
    }

    return res.json({ message: "Tag berhasil dihapus", data: tag });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  store,
  update,
  destroy,
};
