import React from 'react'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'

const Profile = () => {
  return (
    <div className="relative">
    <Menu>
        <MenuButton className="inline-flex items-center gap-2 rounded-md py-1.5 px-3 text-sm font-semibold text-white shadow-sm">
          <div className="w-[40px] h-[40px] flex justify-center items-center bg-white rounded-full">
            <span className="text-xl text-gray-800">AS</span>
          </div>
        </MenuButton>
        <MenuItems className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <MenuItem>
            {({ active }) => (
              <a
                href="#"
                className={`${
                  active ? 'bg-gray-100' : ''
                } block px-4 py-2 text-sm text-gray-700`}
              >
                Saved locations
              </a>
            )}
          </MenuItem>
          <MenuItem>
            {({ active }) => (
              <a
                href="#"
                className={`${
                  active ? 'bg-gray-100' : ''
                } block px-4 py-2 text-sm text-gray-700`}
              >
                logout
              </a>
            )}
          </MenuItem>
        </MenuItems>
      </Menu>
  </div>
  )
}

export default Profile
