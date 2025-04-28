const { AbilityBuilder, Ability } = require('@casl/ability');

const policies = {

   guest(user, { can }) {
     can('read', 'Product'); // Guest hanya bisa melihat produk
   },

   user(user, { can }) {
     can('view', 'Order'); // User bisa melihat pesanan
     can('create', 'Order'); // User bisa membuat pesanan
     can('read', 'Order', { user_id: user._id }); // User hanya bisa melihat pesanan mereka sendiri
     can('update', 'User', { _id: user._id }); // User bisa mengupdate data dirinya sendiri
     can('read', 'Cart', { user_id: user._id }); // User bisa membaca keranjang miliknya
     can('update', 'Cart', { user_id: user._id }); // User bisa mengupdate keranjang miliknya
     can('view', 'DeliveryAddress'); // User bisa melihat alamat pengiriman
     can('create', 'DeliveryAddress', { user_id: user._id }); // User bisa menambah alamat pengiriman
     can('read', 'DeliveryAddress', { user_id: user._id }); // User bisa membaca alamat pengiriman miliknya
     can('update', 'DeliveryAddress', { user_id: user._id }); // User bisa mengupdate alamat pengiriman miliknya
     can('delete', 'DeliveryAddress', { user_id: user._id }); // User bisa menghapus alamat pengiriman miliknya
     can('read', 'Invoice', { user_id: user._id }); // User bisa membaca invoice miliknya
   },

   admin(user, { can }) {
     can('manage', 'all'); // Admin bisa mengelola semua resource
   }
}

function policyFor(user) {
  let builder = new AbilityBuilder();

  if (user && typeof policies[user.role] === 'function') {
    policies[user.role](user, builder);
  } else {
    policies['guest'](user, builder);
  }

  return new Ability(builder.rules);
}

module.exports = {
  policyFor
}
